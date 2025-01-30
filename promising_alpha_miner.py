import json
import re
import time
import argparse
import logging
import os
from itertools import product
import requests
from requests.auth import HTTPBasicAuth
from typing import List, Dict, Tuple
from time import sleep

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('alpha_mining.log'),
        logging.StreamHandler()
    ]
)

class PromisingAlphaMiner:
    def __init__(self, credentials_path: str):
        self.sess = requests.Session()
        self.setup_auth(credentials_path)
        
    def setup_auth(self, credentials_path: str) -> None:
        """Set up authentication with WorldQuant Brain."""
        logging.info(f"Loading credentials from {credentials_path}")
        with open(credentials_path) as f:
            credentials = json.load(f)
        
        username, password = credentials
        self.sess.auth = HTTPBasicAuth(username, password)
        
        logging.info("Authenticating with WorldQuant Brain...")
        response = self.sess.post('https://api.worldquantbrain.com/authentication')
        if response.status_code != 201:
            raise Exception(f"Authentication failed: {response.text}")

    def parse_expression(self, expression: str) -> Tuple[List[Tuple[int, int]], List[int]]:
        """Parse expression to find numeric parameters and their positions."""
        numbers = []
        positions = []
        for match in re.finditer(r'\d+', expression):
            numbers.append(int(match.group()))
            positions.append((match.start(), match.end()))
        return positions, numbers

    def generate_parameter_combinations(self, num_params: int, max_values: List[int], min_value: int = 1) -> List[List[int]]:
        """Generate all possible parameter combinations."""
        ranges = [range(min_value, max_val + 1) for max_val in max_values]
        return list(product(*ranges))

    def create_expression_variant(self, base_expression: str, positions: List[Tuple[int, int]], params: List[int]) -> str:
        """Create a new expression with the given parameters."""
        result = base_expression
        offset = 0
        for (start, end), new_value in zip(positions, params):
            new_str = str(new_value)
            start += offset
            end += offset
            result = result[:start] + new_str + result[end:]
            offset += len(new_str) - (end - start)
        return result

    def test_alpha(self, expression: str) -> Dict:
        """Test an alpha expression using WorldQuant Brain simulation."""
        logging.info(f"Testing alpha: {expression}")
        
        simulation_data = {
            'type': 'REGULAR',
            'settings': {
                'instrumentType': 'EQUITY',
                'region': 'USA',
                'universe': 'TOP3000',
                'delay': 1,
                'decay': 0,
                'neutralization': 'INDUSTRY',
                'truncation': 0.08,
                'pasteurization': 'ON',
                'unitHandling': 'VERIFY',
                'nanHandling': 'OFF',
                'language': 'FASTEXPR',
                'visualization': False,
            },
            'regular': expression
        }

        sim_resp = self.sess.post('https://api.worldquantbrain.com/simulations', json=simulation_data)
        if sim_resp.status_code != 201:
            return None

        sim_progress_url = sim_resp.headers['location']
        
        while True:
            sim_progress_resp = self.sess.get(sim_progress_url)
            retry_after_sec = float(sim_progress_resp.headers.get('Retry-After', 0))
            if retry_after_sec > 0:
                sleep(retry_after_sec)
            else:
                break

        sim_result = sim_progress_resp.json()
        if sim_result.get("status") == "ERROR":
            return None

        alpha_id = sim_result.get("alpha")
        if not alpha_id:
            return None

        alpha_resp = self.sess.get(f'https://api.worldquantbrain.com/alphas/{alpha_id}')
        if alpha_resp.status_code != 200:
            return None

        return alpha_resp.json()

    def meets_criteria(self, alpha_data: Dict) -> bool:
        """Check if alpha meets submission criteria."""
        if not alpha_data.get("is"):
            return False
            
        is_data = alpha_data["is"]
        checks = {check["name"]: check for check in is_data["checks"]}
        
        # Check criteria
        if (is_data["sharpe"] <= 1.25 or
            is_data["turnover"] <= 0.01 or
            is_data["turnover"] >= 0.7 or
            is_data["fitness"] < 1.0 or
            checks.get("CONCENTRATED_WEIGHT", {}).get("result") != "PASS" or
            checks.get("LOW_SUB_UNIVERSE_SHARPE", {}).get("result") != "PASS"):
            return False
            
        return True

    def submit_alpha(self, alpha_id: str) -> bool:
        """Submit an alpha for review."""
        logging.info(f'Attempting to submit alpha {alpha_id}')
        
        self.sess.post(f'https://api.worldquantbrain.com/alphas/{alpha_id}/submit')
        
        while True:
            submit_resp = self.sess.get(f'https://api.worldquantbrain.com/alphas/{alpha_id}/submit')
            if submit_resp.status_code == 404:
                logging.info('Alpha already submitted')
                return False
                
            if submit_resp.content:
                result = submit_resp.json()
                for check in result['is']['checks']:
                    if check['name'] == 'SELF_CORRELATION':
                        logging.info(f'Submission check result: {check}')
                        return check['result'] == 'PASS'
                break
                
            sleep(5)
            
        logging.info(f'Submission response: {submit_resp.json()}')
        return False

    def process_hopeful_alpha(self, alpha_data: Dict) -> bool:
        """Process a single hopeful alpha, trying parameter variations."""
        expression = alpha_data["expression"]
        positions, numbers = self.parse_expression(expression)
        
        if not positions:
            logging.info(f"No numeric parameters found in expression: {expression}")
            return True  # Return True to remove it from hopeful_alphas.json
            
        # Try parameter combinations
        combinations = self.generate_parameter_combinations(len(numbers), numbers)
        logging.info(f"Testing {len(combinations)} parameter combinations")
        
        success = False
        for params in combinations:
            variant = self.create_expression_variant(expression, positions, params)
            result = self.test_alpha(variant)
            
            if result and self.meets_criteria(result):
                logging.info(f"Found successful variant: {variant}")
                if self.submit_alpha(result["id"]):
                    logging.info("Alpha submitted successfully!")
                    success = True
                    break
                    
            sleep(5)  # Delay between tests
        
        # Return True to remove from hopeful_alphas.json whether we succeeded or not
        # since we've tried all combinations
        return True

    def run(self):
        """Main loop to process hopeful alphas."""
        logging.info("Starting promising alpha miner...")
        
        while True:
            try:
                if not os.path.exists('hopeful_alphas.json'):
                    logging.info("No hopeful alphas file found. Waiting...")
                    sleep(60)
                    continue
                    
                with open('hopeful_alphas.json', 'r') as f:
                    hopeful_alphas = json.load(f)
                
                if not hopeful_alphas:
                    logging.info("No hopeful alphas to process. Waiting...")
                    sleep(60)
                    continue
                
                to_remove = []
                for i, alpha in enumerate(hopeful_alphas):
                    logging.info(f"Processing alpha {i+1}/{len(hopeful_alphas)}: {alpha['expression']}")
                    if self.process_hopeful_alpha(alpha):
                        to_remove.append(alpha)
                        
                # Remove processed alphas
                if to_remove:
                    hopeful_alphas = [a for a in hopeful_alphas if a not in to_remove]
                    with open('hopeful_alphas.json', 'w') as f:
                        json.dump(hopeful_alphas, f, indent=2)
                    logging.info(f"Removed {len(to_remove)} processed alphas from hopeful_alphas.json")
                
                logging.info("Waiting for new hopeful alphas...")
                sleep(60)
                
            except KeyboardInterrupt:
                logging.info("Stopping alpha miner...")
                break
                
            except Exception as e:
                logging.error(f"Error in main loop: {str(e)}")
                sleep(300)
                continue

def main():
    parser = argparse.ArgumentParser(description='Mine promising alphas by varying parameters')
    parser.add_argument('--credentials', type=str, default='./credential.txt',
                      help='Path to credentials file (default: ./credential.txt)')
    
    args = parser.parse_args()
    
    miner = PromisingAlphaMiner(args.credentials)
    miner.run()

if __name__ == "__main__":
    main() 