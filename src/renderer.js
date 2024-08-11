const { ipcRenderer } = require('electron');

const fileInput = document.getElementById('fileInput');
const statusMessage = document.getElementById('statusMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const uploadButton = document.getElementById('uploadButton');
const botControlButton = document.getElementById('botControlButton'); // Botão para iniciar/parar o bot

let isBotRunning = false; // Flag para rastrear o estado do bot

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    statusMessage.textContent = `Arquivo selecionado: ${fileInput.files[0].name}`;
  } else {
    statusMessage.textContent = 'Nenhum arquivo selecionado';
  }
});

uploadButton.addEventListener('click', async () => {
  if (fileInput.files.length === 0) {
    statusMessage.textContent = 'Por favor, selecione um arquivo primeiro.';
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async () => {
    const content = reader.result;
    const fileType = determineFileType(content);

    loadingIndicator.style.display = 'block';
    statusMessage.textContent = 'Carregando...';

    try {
      const response = await ipcRenderer.invoke('process-file', { content, fileType });
      loadingIndicator.style.display = 'none';
      if (response.success) {
        statusMessage.textContent = `Arquivo ${file.name} carregado com sucesso!`;
      } else {
        statusMessage.textContent = `Erro ao carregar o arquivo ${file.name}. ${response.message}`;
      }
    } catch (error) {
      loadingIndicator.style.display = 'none';
      statusMessage.textContent = `Erro ao carregar o arquivo ${file.name}. ${error.message}`;
    }
  };
  reader.readAsText(file);
});

botControlButton.addEventListener('click', async () => {
  if (isBotRunning) {
    statusMessage.textContent = 'Parando bot...';
    botControlButton.disabled = true;

    try {
      const response = await ipcRenderer.invoke('stop-bot');
      if (response.success) {
        statusMessage.textContent = 'Bot parado com sucesso!';
        isBotRunning = false;
        botControlButton.textContent = 'Start Bot'; // Muda o texto do botão
      } else {
        statusMessage.textContent = `Erro ao parar o bot: ${response.message}`;
      }
    } catch (error) {
      statusMessage.textContent = `Erro ao parar o bot: ${error.message}`;
    }
  } else {
    statusMessage.textContent = 'Iniciando bot...';
    botControlButton.disabled = true;

    try {
      const response = await ipcRenderer.invoke('start-bot');
      if (response.success) {
        statusMessage.textContent = 'Bot em execução!';
        isBotRunning = true;
        botControlButton.textContent = 'Stop Bot'; // Muda o texto do botão
      } else {
        statusMessage.textContent = `Erro ao iniciar o bot: ${response.message}`;
      }
    } catch (error) {
      statusMessage.textContent = `Erro ao iniciar o bot: ${error.message}`;
    }
  }

  botControlButton.disabled = false;
});

function determineFileType(content) {
  const trimmedContent = content.trim();
  
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}\t\d{2}\/\d{2}\/\d{4}$/.test(trimmedContent)) {
    return 'cpf';
  } else if (/^\S+@\S+\.\S+/.test(trimmedContent)) {
    return 'email';
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d{1,5}:\S+:\S+/.test(trimmedContent)) {
    return 'proxy';
  }
  
  return 'unknown';
}
