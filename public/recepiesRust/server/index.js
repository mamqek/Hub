const express = require('express');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const PORT = 8001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// run-calc?item=supercomputer&amount=10
// Endpoint to run the calculation
app.get('/run-calc', (req, res) => {
    console.log('Received request:', req.query);
    
    const { item, amount } = req.query;
    if (!item || !amount) {
        return res.status(400).json({ error: 'Missing item or amount parameters.' });
    }
  
    // We'll pass the argument as a single string: "supercomputer: 10"
    const arg = `${item}: ${amount}`;
    
    const workingDir = path.join(__dirname, '..');
    
    // Use execFile to run the executable without involving a shell
    execFile('satisfactory_factory_planner.exe', [arg], { cwd: workingDir }, (error, stdout, stderr) => {
        if (error) {
            console.error('Execution error:', error);
            return res.status(500).json({ error: stderr || error.message });
        }
        // Process the output lines
        const outputLines = stdout.split('\n').filter(Boolean);
        res.json({ output: outputLines });
    });
});

app.listen(PORT, () => {
  console.log(`Calculation service running on port ${PORT}`);
});
