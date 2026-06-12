#!/usr/bin/env node
/**
 * Python API Server for OS Company Excel Generation
 * 
 * This is a simple Node.js HTTP server that runs Python scripts.
 * It's separate from the main Cloudflare Workers app to avoid fs module limitations.
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Enable CORS - set headers for ALL responses
  const setCorsHeaders = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  };
  
  setCorsHeaders();

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/generate-ifu2') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { csvData } = JSON.parse(body);
        
        if (!csvData || csvData.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'CSVデータが見つかりません' }));
          return;
        }

        // Create temp directory
        const tmpDir = `/tmp/ifu2-${Date.now()}`;
        fs.mkdirSync(tmpDir, { recursive: true });
        
        const inputPath = path.join(tmpDir, 'input.json');
        const outputPath = path.join(tmpDir, 'output.xlsx');
        
        // Write CSV data to temp file
        fs.writeFileSync(inputPath, JSON.stringify(csvData));
        
        // Execute Python script
        const scriptPath = path.join(__dirname, 'scripts', 'generate_ifu2.py');
        const templatePath = path.join(__dirname, 'templates', '委附表2_テンプレート.xlsx');
        
        const pythonProcess = spawn('python3', [
          scriptPath,
          inputPath,
          templatePath,
          outputPath
        ]);
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error('Python script error:', stderr);
            fs.rmSync(tmpDir, { recursive: true, force: true });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'Excel生成中にエラーが発生しました: ' + stderr 
            }));
            return;
          }
          
          // Read generated Excel file
          if (!fs.existsSync(outputPath)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'Excelファイルが生成されませんでした' 
            }));
            return;
          }
          
          const excelBuffer = fs.readFileSync(outputPath);
          
          // Clean up temp files
          fs.rmSync(tmpDir, { recursive: true, force: true });
          
          // Send Excel file
          const filename = `ifu2_${new Date().toISOString().substring(0, 10)}.xlsx`;
          res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`
          });
          res.end(excelBuffer);
        });
        
        pythonProcess.on('error', (error) => {
          console.error('Failed to start Python process:', error);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Python実行エラー: ' + error.message 
          }));
        });
        
      } catch (error) {
        console.error('Request processing error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Python API Server running on http://localhost:${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/generate-ifu2`);
});
