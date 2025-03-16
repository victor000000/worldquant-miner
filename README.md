# WorldQuant Alpha Generator

This project is a collection of scripts that generate, polish, test, and submit alphas to the WorldQuant platform.

<!-- Beautiful ASCII  art -->


```
 __      __            .__       .___                          __            .__                     
/  \    /  \___________|  |    __| _/________ _______    _____/  |_    _____ |__| ____   ___________ 
\   \/\/   /  _ \_  __ \  |   / __ |/ ____/  |  \__  \  /    \   __\  /     \|  |/    \_/ __ \_  __ \
 \        (  <_> )  | \/  |__/ /_/ < <_|  |  |  // __ \|   |  \  |   |  Y Y  \  |   |  \  ___/|  | \/
  \__/\  / \____/|__|  |____/\____ |\__   |____/(____  /___|  /__|   |__|_|  /__|___|  /\___  >__|   
       \/                         \/   |__|          \/     \/             \/        \/     \/       
```

## Project Architecture

The WorldQuant Alpha Generator is designed with a multi-phase approach to alpha generation, testing, and submission. The architecture is structured into two main components:

### 1. Pre-Consultant Phase

In the pre-consultant phase, the tools focus on single alpha generation, polishing, and evaluation. Key characteristics:
- Single alpha simulation at a time
- Initial exploration and testing
- Manual refinement of alphas
- Basic analysis and submission

### 2. Consultant Phase

The consultant phase enables more advanced workflows:
- Multiple simultaneous alpha simulations
- Automated batch processing
- More sophisticated analysis
- Production-ready alpha management

This two-phase approach allows users to progressively move from exploration to production.

### Architecture Diagram

```
+-------------------------------------------+
|                USER INTERFACE             |
+-------------------------------------------+
                       |
                       v
+-------------------------------------------+
|            AUTHENTICATION LAYER           |
|        (WorldQuant & MoonshotAI)          |
+-------------------------------------------+
                       |
                       v
+---------------------+   +-------------------+
|                     |   |                   |
|  PRE-CONSULTANT     |   |  CONSULTANT       |
|  PHASE              |   |  PHASE            |
|                     |   |                   |
| +---------------+   |   | +---------------+ |
| | Alpha         |   |   | | Machine       | |
| | Generator     |<--|-->| | Miner         | |
| +---------------+   |   | +---------------+ |
|        |            |   |        |          |
|        v            |   |        v          |
| +---------------+   |   | +---------------+ |
| | Alpha         |   |   | | Batch         | |
| | Polisher      |   |   | | Processing    | |
| +---------------+   |   | +---------------+ |
|        |            |   |        |          |
|        v            |   |        v          |
| +---------------+   |   | +---------------+ |
| | Expression    |   |   | | Advanced      | |
| | Miner         |   |   | | Analytics     | |
| +---------------+   |   | +---------------+ |
|        |            |   |        |          |
|        v            |   |        v          |
| +---------------+   |   | +---------------+ |
| | Submission    |   |   | | Portfolio     | |
| | Handler       |-->|-->| | Optimization  | |
| +---------------+   |   | +---------------+ |
|                     |   |                   |
+---------------------+   +-------------------+
                       |
                       v
+-------------------------------------------+
|                 WORLDQUANT                |
|             BRAIN PLATFORM API            |
+-------------------------------------------+
```

### Usage Flow Diagram

```
START
  |
  v
+--------------------+
| Authentication     |
| (credentials.txt)  |
+--------------------+
  |
  v
+--------------------+     +--------------------+
| Choose Tool:       |---->| Alpha Generator    |
|                    |     | (Create new alpha) |
| * Alpha Generator  |     +--------------------+
| * Alpha Polisher   |            |
| * Expression Miner |            v
| * Alpha Submitter  |     +--------------------+
+--------------------+     | Simulation         |
  |                        +--------------------+
  |                              |
  v                              v
+--------------------+     +--------------------+
| Alpha Polisher     |     | Analysis           |
| (Refine existing   |     | (Evaluate metrics) |
|  alpha)            |     +--------------------+
+--------------------+           |
  |                              |
  v                              v
+--------------------+     +--------------------+
| Custom Requirements|---->| Good Performance?  |
| (IR, Turnover...)  |     | (Yes/No)           |
+--------------------+     +--------------------+
                             |            |
                             | Yes        | No
                             v            v
                      +-------------+ +-------------+
                      | Submit      | | Further     |
                      | Alpha       | | Refinement  |
                      +-------------+ +-------------+
                             |            |
                             v            |
                      +-------------+     |
                      | Track       |<----+
                      | Results     |
                      +-------------+
                             |
                             v
                           END
```

## Directory Structure

```
worldquant-miner/
├── python/
│   ├── pre_consultant/            # Tools for initial alpha development
│   │   ├── alpha_generator.py     # Generate alphas with guided approach
│   │   ├── alpha_polisher.py      # Polish existing alphas with AI
│   │   ├── alpha_expression_miner.py # Mine for potential alpha expressions
│   │   ├── alpha_101_testing.py   # Test alphas against standard algorithms
│   │   ├── successful_alpha_submitter.py # Submit validated alphas
│   │   ├── promising_alpha_miner.py # Find promising alpha patterns
│   │   └── clean_up_logs.py       # Maintain log files
│   │
│   ├── pre_consultant_non_ai/     # Non-AI versions of tools
│   │   └── ...
│   │
│   └── consultant/                # Advanced tooling for production
│       ├── machine_miner.py       # Advanced batch alpha generation
│       └── ...
│
├── rust/                          # High-performance Rust implementation
│   └── ...
│
└── README.md                      # Project documentation
```

## Features

- **AI-Powered Alpha Generation**: Leverages MoonshotAI for intelligent alpha creation and refinement
- **Expression Mining**: Discovers potential alpha expressions
- **Alpha Polishing**: Refines alphas for improved performance
- **Batch Simulation**: Tests multiple alphas in parallel (consultant phase)
- **Performance Analysis**: Evaluates alpha quality across multiple metrics
- **Automated Submission**: Streamlines the process of submitting alphas to WorldQuant Brain

## Usage Guide

### Pre-Consultant Phase Tools

#### Alpha Generator

Creates new alpha expressions with guided AI and simulates them:

```bash
python alpha_generator.py --credentials path/to/credentials.txt --moonshot-key your_moonshot_api_key
```

#### Alpha Polisher

Refines existing alpha expressions and tests them against benchmarks:

```bash
python alpha_polisher.py --credentials path/to/credentials.txt --moonshot-key your_moonshot_api_key
```

The polisher allows you to input your own expression and provide specific requirements for improvement, such as:
- Improving Information Ratio (IR)
- Reducing turnover
- Enhancing market neutrality
- Adding technical indicators

#### Alpha Expression Miner

Searches for alpha expressions based on input parameters:

```bash
python alpha_expression_miner.py --expression "your_base_expression" --credentials path/to/credentials.txt
```

This tool explores variations of a base expression to find promising candidates.

#### Clean Up Logs

Manages log files to prevent disk space issues:

```bash
python clean_up_logs.py
```

This utility helps maintain system efficiency by cleaning up old or oversized log files.

#### Successful Alpha Submitter

Submits validated alphas to the WorldQuant platform:

```bash
python successful_alpha_submitter.py --credentials path/to/credentials.txt
```

This tool handles the submission process, including formatting and verification.

### Consultant Phase Tools

#### Machine Miner

Advanced batch alpha generation and testing:

```bash
python machine_miner.py --credentials path/to/credentials.txt --moonshot-key your_moonshot_api_key
```

## Why MoonshotAI?

This project uses MoonshotAI instead of alternatives like ChatGPT for several reasons:
1. **Accessibility in China**: Due to the Great Firewall (GFW), many users in China have limited access to other AI services
2. **Specialized Knowledge**: MoonshotAI has been fine-tuned for financial applications
3. **Performance**: Offers strong capabilities for alpha expression generation and analysis

For users outside China, the code can be adapted to use alternative AI services.

## Core Code Walkthrough

### Alpha Generation Process

The alpha generation process follows this general flow:

1. **Authentication**: Connect to WorldQuant Brain API
   ```python
   def setup_auth(self, credentials_path: str) -> None:
       with open(credentials_path) as f:
           credentials = json.load(f)
       username, password = credentials
       self.sess.auth = HTTPBasicAuth(username, password)
       response = self.sess.post('https://api.worldquantbrain.com/authentication')
   ```

2. **Operator Fetching**: Retrieve available operators
   ```python
   def fetch_operators(self) -> Dict:
       response = self.sess.get('https://api.worldquantbrain.com/operators')
       return response.json()
   ```

3. **Expression Generation/Polishing**: Create or refine alpha expressions
   ```python
   # Example from alpha_polisher.py
   def polish_expression(self, expression: str, user_requirements: str = "") -> Dict:
       # AI request to polish the expression based on requirements
       # Returns improved expression
   ```

4. **Simulation**: Test the alpha expression
   ```python
   def simulate_alpha(self, expression: str) -> Dict:
       # Submit simulation request with appropriate parameters
       # Wait for completion
       # Retrieve and return results
   ```

5. **Analysis**: Evaluate performance metrics
   ```python
   # Performance analysis of IR, turnover, drawdown, etc.
   ```

6. **Submission**: Submit promising alphas
   ```python
   # Validate and submit to WorldQuant
   ```

### Simulation Configuration

The simulation configuration is critical to accurate testing:

```python
data = {
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
```

## Customizing the Project

### Adding New Operators

To add support for new operators:

1. Update the operator documentation in relevant code files
2. Add validation for the new operators
3. Include examples in the polishing prompts

### Supporting New Regions or Universes

Modify the simulation settings in `simulate_alpha` method:

```python
data = {
    'type': 'REGULAR',
    'settings': {
        # Modify these parameters
        'region': 'YOUR_REGION',  # e.g., 'JAPAN', 'EUROPE'
        'universe': 'YOUR_UNIVERSE',  # e.g., 'TOP1000', 'TOP5000'
        # Other settings...
    }
}
```

### Changing AI Provider

To use a different AI provider:
1. Update the API endpoints in `analyze_alpha` and `polish_expression` methods
2. Modify the request format to match the new provider's API
3. Update authentication as needed

## Contributing

We welcome contributions from the community! Here's how you can help:

### Code Contributions

1. Fork the repository
2. Create a new branch (`git checkout -b feature/improvement`)
3. Make your changes
4. Run tests to ensure nothing is broken
5. Commit your changes (`git commit -am 'Add new feature'`)
6. Push to the branch (`git push origin feature/improvement`)
7. Create a Pull Request

### Bug Reports & Feature Requests

- Use the GitHub issue tracker to report bugs
- Clearly describe the issue including steps to reproduce
- Make feature requests through GitHub issues
- Tag issues appropriately

### Documentation

- Help improve documentation
- Add code comments where needed
- Update the README with new features
- Write tutorials and examples

### Guidelines

- Follow existing code style and conventions
- Write clear commit messages
- Add tests for new features
- Update documentation for changes
- Be respectful to other contributors

### Getting Help

- Join our community chat
- Ask questions in GitHub issues
- Read existing documentation
- Check closed issues for solutions

We appreciate all contributions that help make this project better!

## TODO
- Integrate more templates
- Integrate more datafields
- Integrate more operators
- Integrate more regions
- Integrate more universes
- Integrate more alphas
- Add financial research pdf alpha expression generator

