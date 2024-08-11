const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // Para executar comandos do sistema
const crypto = require('crypto'); // Para gerar nomes aleatórios

// Defina o diretório fixo onde os arquivos serão salvos
const FIXED_DIRECTORY = path.join(__dirname, '../config/fetch');

let botProcess = null; // Variável para armazenar a referência do processo do bot

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'),
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function getLastId(fileType) {
    let maxId = 0;

    if (fs.existsSync(FIXED_DIRECTORY)) {
        const files = fs.readdirSync(FIXED_DIRECTORY);
        const typeFiles = files.filter(file => file.includes(`data_${fileType}_`));
        
        typeFiles.forEach(file => {
            const data = JSON.parse(fs.readFileSync(path.join(FIXED_DIRECTORY, file), 'utf-8'));
            data.forEach(item => {
                if (item.id > maxId) {
                    maxId = item.id;
                }
            });
        });
    }

    return maxId;
}

ipcMain.handle('process-file', async (event, { content, fileType }) => {
    let jsonData;
    
    try {
        const lastId = getLastId(fileType);
        let currentId = lastId + 1;
        
        const lines = content.split('\n').filter(line => line.trim() !== '');
        if (fileType === 'email') {
            // Email data
            jsonData = lines.map(line => {
                const [email, pass, submail] = line.split(':');
                return {
                    id: currentId++,
                    email,
                    pass,
                    submail
                };
            });
        } else if (fileType === 'proxy') {
            // Proxy data
            jsonData = lines.map(line => {
                const [ip, port, username, password] = line.split(':');
                return {
                    id: currentId++,
                    ip,
                    port,
                    username,
                    password
                };
            });
        } else if (fileType === 'cpf') {
            // CPF data
            jsonData = lines.map(line => {
                const [cpf, date] = line.split('\t');
                return {
                    id: currentId++,
                    cpf,
                    date
                };
            });
        } else {
            return { success: false, message: 'Formato de arquivo desconhecido' };
        }

        // Cria o diretório fixo se não existir
        if (!fs.existsSync(FIXED_DIRECTORY)) {
            fs.mkdirSync(FIXED_DIRECTORY, { recursive: true });
        }

        // Gera um nome aleatório para o arquivo
        const randomName = crypto.randomBytes(4).toString('hex');
        const fileName = `data_${fileType}_${randomName}.json`;
        const filePathToSave = path.join(FIXED_DIRECTORY, fileName);

        fs.writeFileSync(filePathToSave, JSON.stringify(jsonData, null, 2));
        return { success: true, filePath: filePathToSave };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('start-bot', async () => {
    if (botProcess) {
        return { success: false, message: 'Bot já está em execução' };
    }

    const botPath = path.join(__dirname, 'bot.js'); // Ajuste o caminho conforme necessário
    botProcess = exec(`node ${botPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao executar o bot: ${stderr}`);
            botProcess = null;
            return;
        }
        console.log(`Bot iniciado com sucesso: ${stdout}`);
    });

    return { success: true, message: 'Bot iniciado com sucesso' };
});

ipcMain.handle('stop-bot', async () => {
    if (!botProcess) {
        return { success: false, message: 'Bot não está em execução' };
    }

    botProcess.kill();
    botProcess = null;
    console.log('Bot parado');
    return { success: true, message: 'Bot parado com sucesso' };
});
