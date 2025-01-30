import argparse
import requests
import json
import os
from time import sleep
from requests.auth import HTTPBasicAuth
from openai import OpenAI
from typing import List, Dict
import time

class AlphaGenerator:
    def __init__(self, credentials_path: str, moonshot_api_key: str):
        self.sess = requests.Session()
        self.setup_auth(credentials_path)
        self.moonshot_api_key = moonshot_api_key
        
    def setup_auth(self, credentials_path: str) -> None:
        """Set up authentication with WorldQuant Brain."""
        print(f"Loading credentials from {credentials_path}")
        with open(credentials_path) as f:
            credentials = json.load(f)
        
        username, password = credentials
        self.sess.auth = HTTPBasicAuth(username, password)
        
        print("Authenticating with WorldQuant Brain...")
        response = self.sess.post('https://api.worldquantbrain.com/authentication')
        print(f"Authentication response status: {response.status_code}")
        print(f"Authentication response: {response.text[:500]}...")  # Print first 500 chars
        
        if response.status_code != 201:
            raise Exception(f"Authentication failed: {response.text}")
        
    def get_data_fields(self) -> List[Dict]:
        """Fetch available data fields from WorldQuant Brain."""
        params = {
            'dataset.id': 'fundamental6',
            'delay': 1,
            'instrumentType': 'EQUITY',
            'limit': 20,
            'offset': 0,
            'region': 'USA',
            'universe': 'TOP3000'
        }
        
        print("Requesting data fields...")
        response = self.sess.get('https://api.worldquantbrain.com/data-fields', params=params)
        print(f"Data fields response status: {response.status_code}")
        print(f"Data fields response: {response.text[:500]}...")  # Print first 500 chars
        
        if response.status_code != 200:
            raise Exception(f"Failed to get data fields: {response.text}")
        
        data = response.json()
        if 'results' not in data:
            raise Exception(f"Unexpected data fields response format. Keys: {list(data.keys())}")
        
        return data['results']

    def get_operators(self) -> List[Dict]:
        """Fetch available operators from WorldQuant Brain."""
        print("Requesting operators...")
        response = self.sess.get('https://api.worldquantbrain.com/operators')
        print(f"Operators response status: {response.status_code}")
        print(f"Operators response: {response.text[:500]}...")  # Print first 500 chars
        
        if response.status_code != 200:
            raise Exception(f"Failed to get operators: {response.text}")
        
        data = response.json()
        # The operators endpoint might return a direct array instead of an object with 'items' or 'results'
        if isinstance(data, list):
            return data
        elif 'results' in data:
            return data['results']
        else:
            raise Exception(f"Unexpected operators response format. Response: {data}")

    def generate_alpha_ideas(self, data_fields: List[Dict], operators: List[Dict]) -> List[str]:
        """Generate alpha ideas using Moonshot API directly."""
        print("Organizing operators by category...")
        operator_by_category = {}
        for op in operators:
            category = op['category']
            if category not in operator_by_category:
                operator_by_category[category] = []
            operator_by_category[category].append({
                'name': op['name'],
                'definition': op['definition'],
                'description': op['description']
            })

        print("Preparing prompt...")
        prompt = f"""As a quantitative analyst, generate 5 sophisticated alpha factors using the available operators and data fields.

Available Data Fields:
{[field['id'] for field in data_fields]}

Available Operators by Category:

Time Series Operators:
{[op['name'] for op in operator_by_category.get('Time Series', [])]}

Cross Sectional Operators:
{[op['name'] for op in operator_by_category.get('Cross Sectional', [])]}

Arithmetic Operators:
{[op['name'] for op in operator_by_category.get('Arithmetic', [])]}

Key operator definitions:
- ts_mean(x, d): Returns average value of x for the past d days
- ts_std_dev(x, d): Returns standard deviation of x for the past d days
- ts_delta(x, d): Returns x - ts_delay(x, d)
- zscore(x): Standardizes values cross-sectionally
- rank(x): Ranks values cross-sectionally between 0 and 1

Generate 5 alpha factors that:
1. Combine fundamental data with time series operations
2. Use cross-sectional operations for normalization
3. Include at least one multi-step calculation
4. Are based on sound financial logic
5. Use operators like ts_mean, ts_delta, rank, or zscore for better statistical properties

Format each alpha as a single line expression using the available operators and data fields.
Provide a brief comment explaining the financial logic for each alpha.

Example format:
# Momentum of asset turnover ratio
ts_mean(divide(revenue, assets), 20)"""

        headers = {
            'Authorization': f'Bearer {self.moonshot_api_key}',
            'Content-Type': 'application/json'
        }

        data = {
            'model': 'moonshot-v1-8k',
            'messages': [
                {
                    "role": "system", 
                    "content": "You are a quantitative analyst expert in generating alpha factors for stock market prediction."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            'temperature': 0.3
        }

        print("Sending request to Moonshot API...")
        response = requests.post(
            'https://api.moonshot.cn/v1/chat/completions',
            headers=headers,
            json=data
        )

        print(f"Moonshot API response status: {response.status_code}")
        print(f"Moonshot API response headers: {dict(response.headers)}")
        print(f"Moonshot API response: {response.text[:500]}...")  # Print first 500 chars

        if response.status_code != 200:
            raise Exception(f"Moonshot API request failed: {response.text}")

        response_data = response.json()
        print(f"Moonshot API response JSON keys: {list(response_data.keys())}")

        if 'choices' not in response_data:
            raise Exception(f"Unexpected Moonshot API response format: {response_data}")

        if not response_data['choices']:
            raise Exception("No choices returned from Moonshot API")

        print("Processing Moonshot API response...")
        content = response_data['choices'][0]['message']['content']
        
        # Extract pure alpha expressions by:
        # 1. Remove markdown backticks
        # 2. Remove numbering (e.g., "1. ", "2. ")
        # 3. Skip comments
        alpha_ideas = []
        for line in content.split('\n'):
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('*'):
                continue
            # Remove numbering and backticks
            line = line.replace('`', '')
            if '. ' in line:
                line = line.split('. ', 1)[1]
            if line and not line.startswith('Comment:'):
                alpha_ideas.append(line)
        
        print(f"Generated {len(alpha_ideas)} alpha ideas")
        for i, alpha in enumerate(alpha_ideas, 1):
            print(f"Alpha {i}: {alpha}")
        
        return alpha_ideas

    def test_alpha(self, alpha_expression: str) -> Dict:
        print(f"Testing alpha: {alpha_expression}")

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
        if sim_resp.status_code != 201:
            return {"status": "error", "message": sim_resp.text}

        sim_progress_url = sim_resp.headers['location']
        
        while True:
            sim_progress_resp = self.sess.get(sim_progress_url)
            retry_after_sec = float(sim_progress_resp.headers.get('Retry-After', 0))
            if retry_after_sec > 0:
                sleep(retry_after_sec)
            else:
                break

        sim_result = sim_progress_resp.json()
        
        # If simulation was successful, check alpha status
        if (sim_result.get("status") != "ERROR" and 
            "alpha" in sim_result):
            
            alpha_id = sim_result["alpha"]
            print(f"Checking status for alpha {alpha_id}...")
            
            alpha_resp = self.sess.get(f'https://api.worldquantbrain.com/alphas/{alpha_id}')
            if alpha_resp.status_code == 200:
                alpha_data = alpha_resp.json()
                
                # Check if alpha is promising
                if alpha_data.get("is") and alpha_data["is"].get("fitness", 0) > 0.5:
                    print(f"Found promising alpha! Fitness: {alpha_data['is']['fitness']}")
                    self.log_hopeful_alpha(alpha_expression, alpha_data)
                
                return {"status": "success", "result": sim_result, "alpha_data": alpha_data}
        
        return {"status": "success", "result": sim_result}

    def log_hopeful_alpha(self, expression: str, alpha_data: Dict) -> None:
        """Log promising alphas to a JSON file."""
        log_file = 'hopeful_alphas.json'
        
        # Load existing data
        existing_data = []
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r') as f:
                    existing_data = json.load(f)
            except json.JSONDecodeError:
                print(f"Warning: Could not parse {log_file}, starting fresh")
        
        # Add new alpha with timestamp
        entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "expression": expression,
            "alpha_id": alpha_data["id"],
            "fitness": alpha_data["is"]["fitness"],
            "sharpe": alpha_data["is"]["sharpe"],
            "turnover": alpha_data["is"]["turnover"],
            "returns": alpha_data["is"]["returns"],
            "grade": alpha_data["grade"],
            "checks": alpha_data["is"]["checks"]
        }
        
        existing_data.append(entry)
        
        # Save updated data
        with open(log_file, 'w') as f:
            json.dump(existing_data, f, indent=2)
        
        print(f"Logged promising alpha to {log_file}")

def main():
    parser = argparse.ArgumentParser(description='Generate and test alpha factors using WorldQuant Brain API')
    parser.add_argument('--credentials', type=str, default='./credential.txt',
                      help='Path to credentials file (default: ./credential.txt)')
    parser.add_argument('--output-dir', type=str, default='./results',
                      help='Directory to save results (default: ./results)')
    parser.add_argument('--batch-size', type=int, default=5,
                      help='Number of alpha factors to generate per batch (default: 5)')
    parser.add_argument('--sleep-time', type=int, default=60,
                      help='Sleep time between batches in seconds (default: 60)')
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Get Moonshot API key
    moonshot_api_key = "YOUR_MOONSHOT_API_KEY"
    if not moonshot_api_key:
        raise ValueError("MOONSHOT_API_KEY environment variable not set")

    try:
        # Initialize alpha generator
        generator = AlphaGenerator(args.credentials, moonshot_api_key)
        
        # Get data fields and operators once
        print("Fetching data fields and operators...")
        data_fields = generator.get_data_fields()
        operators = generator.get_operators()
        
        batch_number = 1
        successful_alphas = 0
        
        print(f"Starting continuous alpha mining with batch size {args.batch_size}")
        print(f"Results will be saved to {args.output_dir}")
        
        while True:
            try:
                print(f"\nProcessing batch #{batch_number}")
                print("-" * 50)
                
                # Generate alpha ideas
                print(f"Generating {args.batch_size} alpha ideas...")
                alpha_ideas = generator.generate_alpha_ideas(data_fields, operators)
                
                # Test each alpha
                results = []
                for i, alpha in enumerate(alpha_ideas, 1):
                    try:
                        print(f"Testing alpha {i}/{len(alpha_ideas)}: {alpha}")
                        result = generator.test_alpha(alpha)
                        results.append({
                            "alpha": alpha,
                            "result": result
                        })
                        
                        # Check if alpha was successful
                        if (result.get("status") == "success" and 
                            result.get("result", {}).get("status") != "ERROR"):
                            successful_alphas += 1
                            
                    except Exception as e:
                        print(f"Error testing alpha: {str(e)}")
                        continue
                
                # Save batch results
                timestamp = int(time.time())
                output_file = os.path.join(args.output_dir, f'batch_{batch_number}_{timestamp}.json')
                with open(output_file, 'w') as f:
                    json.dump(results, f, indent=2)
                
                print(f"Batch {batch_number} results saved to {output_file}")
                print(f"Total successful alphas so far: {successful_alphas}")
                
                batch_number += 1
                
                # Sleep between batches
                print(f"Sleeping for {args.sleep_time} seconds...")
                sleep(args.sleep_time)
                
            except Exception as e:
                print(f"Error in batch {batch_number}: {str(e)}")
                print("Sleeping for 5 minutes before retrying...")
                sleep(300)
                continue
        
    except KeyboardInterrupt:
        print("\nStopping alpha mining...")
        print(f"Total batches processed: {batch_number - 1}")
        print(f"Total successful alphas: {successful_alphas}")
        return 0
        
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main()) 