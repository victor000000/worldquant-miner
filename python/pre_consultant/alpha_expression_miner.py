import argparse
import requests
import json
import os
import re
from time import sleep
from requests.auth import HTTPBasicAuth
from typing import List, Dict, Tuple
import time
import logging

# Configure logging at the top of the file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('alpha_miner.log')
    ]
)
logger = logging.getLogger(__name__)

class AlphaExpressionMiner:
    def __init__(self, credentials_path: str):
        logger.info("Initializing AlphaExpressionMiner")
        self.sess = requests.Session()
        self.setup_auth(credentials_path)
        
    def setup_auth(self, credentials_path: str) -> None:
        """Set up authentication with WorldQuant Brain."""
        logger.info(f"Loading credentials from {credentials_path}")
        with open(credentials_path) as f:
            credentials = json.load(f)
        
        username, password = credentials
        self.sess.auth = HTTPBasicAuth(username, password)
        
        logger.info("Authenticating with WorldQuant Brain...")
        response = self.sess.post('https://api.worldquantbrain.com/authentication')
        logger.info(f"Authentication response status: {response.status_code}")
        
        if response.status_code != 201:
            logger.error(f"Authentication failed: {response.text}")
            raise Exception(f"Authentication failed: {response.text}")
        logger.info("Authentication successful")

    def parse_expression(self, expression: str) -> List[Tuple[int, int, int]]:
        """Parse the alpha expression to find numeric parameters and their positions."""
        logger.info(f"Parsing expression: {expression}")
        number_positions = []
        # Match numbers that:
        # 1. Are preceded by '(' or ',' or space
        # 2. Are not part of a variable name (not preceded/followed by letters)
        for match in re.finditer(r'(?<=[,()\s])\d+(?![a-zA-Z])', expression):
            number = int(match.group())
            start_pos = match.start()
            end_pos = match.end()
            number_positions.append((number, start_pos, end_pos))
            logger.debug(f"Found parameter: {number} at position {start_pos}-{end_pos}")
        
        logger.info(f"Found {len(number_positions)} parameters to vary")
        return number_positions

    def generate_variations(self, expression: str, range_size: int = 25) -> List[str]:
        """Generate variations of the expression by varying each parameter number within ±range_size."""
        logger.info(f"Generating variations with range ±{range_size}")
        variations = []
        number_positions = self.parse_expression(expression)
        
        # Sort positions in reverse order to modify from end to start
        number_positions.sort(reverse=True, key=lambda x: x[1])
        
        for number, start, end in number_positions:
            min_val = max(1, number - range_size)
            max_val = number + range_size
            logger.info(f"Varying parameter {number} from {min_val} to {max_val}")
            
            # Generate variations for this number
            for val in range(min_val, max_val + 1):
                if val != number:
                    new_expr = expression[:start] + str(val) + expression[end:]
                    variations.append(new_expr)
                    logger.debug(f"Generated variation: {new_expr}")
        
        logger.info(f"Generated {len(variations)} total variations")
        return variations

    def test_alpha(self, alpha_expression: str) -> Dict:
        """Test an alpha expression using WorldQuant Brain simulation."""
        logger.info(f"Testing alpha: {alpha_expression}")
        
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
            'regular': alpha_expression
        }

        sim_resp = self.sess.post('https://api.worldquantbrain.com/simulations', json=simulation_data)
        logger.info(f"Simulation creation response: {sim_resp.status_code}")
        
        if sim_resp.status_code != 201:
            logger.error(f"Simulation creation failed: {sim_resp.text}")
            return {"status": "error", "message": sim_resp.text}

        sim_progress_url = sim_resp.headers.get('location')
        if not sim_progress_url:
            logger.error("No simulation ID received in response headers")
            return {"status": "error", "message": "No simulation ID received"}
        
        logger.info(f"Monitoring simulation at: {sim_progress_url}")
        
        # Monitor simulation progress
        retry_count = 0
        max_retries = 3
        while True:
            try:
                sim_progress_resp = self.sess.get(sim_progress_url)
                
                # Handle empty response
                if not sim_progress_resp.text.strip():
                    logger.debug("Empty response, simulation still initializing...")
                    sleep(10)
                    continue
                
                # Try to parse JSON response
                try:
                    progress_data = sim_progress_resp.json()
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to decode JSON response: {sim_progress_resp.text}")
                    retry_count += 1
                    if retry_count > max_retries:
                        logger.error("Max retries exceeded for JSON decode")
                        return {"status": "error", "message": "Failed to decode simulation response"}
                    sleep(10)
                    continue
                
                status = progress_data.get("status")
                logger.info(f"Simulation status: {status}")
                
                if status == "COMPLETE" or status == "WARNING":
                    logger.info("Simulation completed successfully")
                    return {"status": "success", "result": progress_data}
                elif status in ["FAILED", "ERROR"]:
                    logger.error(f"Simulation failed: {progress_data}")
                    return {"status": "error", "message": progress_data}
                
                sleep(10)
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error: {str(e)}")
                retry_count += 1
                if retry_count > max_retries:
                    return {"status": "error", "message": f"Request failed after {max_retries} retries"}
                sleep(10)

def main():
    parser = argparse.ArgumentParser(description='Mine alpha expression variations')
    parser.add_argument('--credentials', type=str, default='./credential.txt',
                      help='Path to credentials file (default: ./credential.txt)')
    parser.add_argument('--expression', type=str, required=True,
                      help='Base alpha expression to mine variations from')
    parser.add_argument('--range', type=int, default=25,
                      help='Range around each number (default: ±25)')
    parser.add_argument('--output', type=str, default='mined_expressions.json',
                      help='Output file for results (default: mined_expressions.json)')
    parser.add_argument('--log-level', type=str, default='INFO',
                      choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                      help='Set the logging level (default: INFO)')
    
    args = parser.parse_args()
    
    # Update log level if specified
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    logger.info(f"Starting alpha expression mining with parameters:")
    logger.info(f"Expression: {args.expression}")
    logger.info(f"Range: ±{args.range}")
    logger.info(f"Output file: {args.output}")
    
    miner = AlphaExpressionMiner(args.credentials)
    
    variations = miner.generate_variations(args.expression, args.range)
    
    results = []
    total = len(variations)
    for i, var in enumerate(variations, 1):
        logger.info(f"Testing variation {i}/{total}: {var}")
        result = miner.test_alpha(var)
        if result["status"] == "success":
            logger.info(f"Successful test for: {var}")
            results.append({
                "expression": var,
                "result": result["result"]
            })
        else:
            logger.error(f"Failed to test variation: {var}")
            logger.error(f"Error: {result['message']}")
    
    # Save results
    logger.info(f"Saving {len(results)} results to {args.output}")
    with open(args.output, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info("Mining complete")

if __name__ == "__main__":
    main()
