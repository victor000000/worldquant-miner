# WorldQuant Alpha Generator

This project is a collection of scripts that generate and submit alphas to the WorldQuant platform.

<!-- Beautiful ASCII  art -->


```
 __      __            .__       .___                          __            .__                     
/  \    /  \___________|  |    __| _/________ _______    _____/  |_    _____ |__| ____   ___________ 
\   \/\/   /  _ \_  __ \  |   / __ |/ ____/  |  \__  \  /    \   __\  /     \|  |/    \_/ __ \_  __ \
 \        (  <_> )  | \/  |__/ /_/ < <_|  |  |  // __ \|   |  \  |   |  Y Y  \  |   |  \  ___/|  | \/
  \__/\  / \____/|__|  |____/\____ |\__   |____/(____  /___|  /__|   |__|_|  /__|___|  /\___  >__|   
       \/                         \/   |__|          \/     \/             \/        \/     \/       
```



Discord: https://discord.gg/K8X5xu2e




# Rust Alpha Generator

This is a Rust implementation of the alpha generator.

## Installation

```bash
cargo build --release
```

## Usage

```bash
cargo run --release
```

# Python Alpha Generator

This is a Python implementation of the alpha generator.

## Pre-Consultant

### Installation

```bash
pip install -r requirements.txt
```

### Usage

```bash
python alpha_generator.py
```

```bash
python alpha_expression_miner.py --expression "expression"
```

```bash
python clean_up_logs.py
```

```bash
python successful_alpha_submitter.py
```




## Consultant

### Installation

```bash
pip install -r requirements.txt
```

### Usage

```bash
python machine_miner.py
```

# TODO
- Integrate more templates
- Integrate more datafields
- Integrate more operators
- Integrate more regions
- Integrate more universes
- Integrate more alphas

# Incoming Features
## GUI
### Introduction
- An interim solution to manage WorldQuant Alpha Generator with python GUI
### Preview
![GUI](./gui.jpg)
## Agent
### Preview
![Agent](./agent.jpg)
### Introduction
- An interim solution to manage agent networks with python GUI
## Agent site - agent-next
### Introduction
- Key Points
  - A free(as of now because it is not done jajaja) user-friendly interface to create agent networks to work with the WorldQuant Alpha Generator
  - Open source and frontend only database interactions so you can see that the website does not save your WorldQuant credentials but only your email will be used to identify you
    - You would need to first verify with WorldQuant via API then verify with the site
    - No WorldQuant credentials are saved on the server side but your email will be used to identify you
  - Login required for managing agent networks
  - Free tier available
  - Leverage vector databases to store agent memories
- Features
  - Chat with agents
  - Create agent networks
  - Manage agent networks
  - Delete agent networks
  - View agent networks
  - View agent memories
  - Alpha Polisher - Polish existing alphas or generate new ideas using AI

### Preview
![Agent site](./agent-site.jpg)



# Contribute
## How to Contribute

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

# Dify Components Integration

This project integrates components from Dify (agent-dify-api and agent-dify-web) for enhanced alpha mining capabilities. These components are used under the Apache License 2.0.

## Legal Notice

The Dify components (agent-dify-api and agent-dify-web) are licensed under the Apache License 2.0. This means:

1. You may use, reproduce, and distribute the Dify components
2. You may modify and create derivative works
3. You must include the original copyright notice
4. You must state significant changes made to the original software
5. You must include a copy of the Apache License 2.0

For the complete terms and conditions, please refer to the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

## Usage of Dify Components

The Dify components are integrated into this project to enhance alpha mining capabilities:

1. **agent-dify-api**: Provides API endpoints for alpha generation and mining
2. **agent-dify-web**: Offers a web interface for alpha mining operations

### Integration with Alpha Mining

The Dify components are used to:
- Generate and validate alpha expressions
- Process and analyze market data
- Provide a user-friendly interface for alpha mining
- Enable automated alpha generation and submission

### Attribution

This project uses components from Dify, which are licensed under the Apache License 2.0. The original copyright notices and license information are preserved in the respective component directories.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Tutorial: Using Dify Components for Alpha Mining

### Prerequisites
1. Docker and Docker Compose installed
2. Python 3.8 or higher
3. Node.js 16 or higher (for web interface)

### Setting Up Dify Components

1. **Start the Dify Services**
```bash
# Start the Dify API and Web services
docker-compose -f docker-compose.middleware.yaml up -d
```

2. **Verify Services**
```bash
# Check if services are running
docker ps
```

### Using the Dify Web Interface

1. **Access the Web Interface**
   - Open your browser and navigate to `http://localhost:3000`
   - Log in with your credentials

2. **Creating Alpha Mining Tasks**
   - Click on "New Task" in the web interface
   - Select "Alpha Mining" as the task type
   - Configure your mining parameters:
     - Data fields to use
     - Time period
     - Universe selection
     - Mining strategy

3. **Monitoring Mining Progress**
   - View real-time mining progress in the dashboard
   - Check generated alphas in the "Results" section
   - Export successful alphas for submission

### Using the Dify API

1. **API Authentication**
```python
import requests

API_URL = "http://localhost:8000"
headers = {
    "Authorization": "Bearer your_api_key"
}
```

2. **Creating Mining Tasks**
```python
# Create a new mining task
response = requests.post(
    f"{API_URL}/api/v1/mining/tasks",
    headers=headers,
    json={
        "name": "My Mining Task",
        "data_fields": ["close", "volume", "high", "low"],
        "time_period": "1Y",
        "universe": "US",
        "strategy": "correlation"
    }
)
```

3. **Checking Task Status**
```python
# Get task status
task_id = response.json()["task_id"]
status = requests.get(
    f"{API_URL}/api/v1/mining/tasks/{task_id}",
    headers=headers
)
```

4. **Retrieving Results**
```python
# Get mining results
results = requests.get(
    f"{API_URL}/api/v1/mining/tasks/{task_id}/results",
    headers=headers
)
```

### Best Practices

1. **Resource Management**
   - Monitor system resources during mining
   - Adjust mining parameters based on available resources
   - Use appropriate timeouts for long-running tasks

2. **Error Handling**
   - Implement proper error handling in your API calls
   - Check task status regularly
   - Save intermediate results

3. **Performance Optimization**
   - Use appropriate batch sizes
   - Implement caching where possible
   - Monitor and adjust mining parameters

### Troubleshooting

1. **Service Issues**
   - Check Docker container logs: `docker logs <container_id>`
   - Verify service health: `docker-compose ps`
   - Restart services if needed: `docker-compose restart`

2. **API Issues**
   - Verify API endpoint availability
   - Check authentication tokens
   - Monitor API rate limits

3. **Mining Issues**
   - Verify data field availability
   - Check universe configuration
   - Monitor memory usage

For more detailed information about specific features and configurations, refer to the [Dify Documentation](https://docs.dify.ai).

