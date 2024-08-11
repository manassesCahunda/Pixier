const { app, BrowserWindow, dialog } = require('electron');
const Automation = require('./util');
const config = require('config');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const FIXED_DIRECTORY = path.join(__dirname, '../config/fetch');
const TEMP_DIRECTORY = path.join(__dirname, '../config/db');
const filePath = path.join(__dirname, '../config/db/data.json');

const username = config.get('username');
const password = config.get('password');

let mainWindow;

function showError(message) {
  if (mainWindow) {
    dialog.showErrorBox('Erro', message);
  }
}

function showMessage(message) {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Informação',
      message: message
    });
  }
}


function addItemToFile(filePath, newItem, callback) {
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      showMessage('Arquivo não encontrado. Criando um novo arquivo...');
      fs.writeFile(filePath, JSON.stringify([]), 'utf8', (writeError) => {
        if (writeError) {
          showError('Erro ao criar o arquivo: ' + writeError.message);
          return callback(writeError);
        }
        showMessage('Arquivo criado com sucesso.');
        readAndWriteFile();
      });
    } else {
      showMessage('Arquivo encontrado. Continuando com a leitura e escrita...');
      readAndWriteFile();
    }
  });

  function readAndWriteFile() {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        showError('Erro ao ler o arquivo: ' + err.message);
        return callback(err);
      }

      let jsonArray;
      try {
        jsonArray = JSON.parse(data);
        showMessage('Arquivo lido com sucesso. Dados atuais: ' + JSON.stringify(jsonArray));
      } catch (parseError) {
        showError('Erro ao parsear o arquivo JSON: ' + parseError.message);
        return callback(parseError);
      }

      const itemExists = jsonArray.some(existingItem =>
        existingItem.email === newItem.email &&
        existingItem.ip === newItem.ip &&
        existingItem.cpf === newItem.cpf
      );

      if (itemExists) {
        showMessage('Item já existe no arquivo. Não será adicionado: ' + JSON.stringify(newItem));
        return callback(null);
      }

      jsonArray.push(newItem);
      showMessage('Item adicionado: ' + JSON.stringify(newItem));
      showMessage('Dados atualizados: ' + JSON.stringify(jsonArray));

      fs.writeFile(filePath, JSON.stringify(jsonArray, null, 2), 'utf8', (writeError) => {
        if (writeError) {
          showError('Erro ao escrever o arquivo: ' + writeError.message);
          return callback(writeError);
        }
        showMessage('Item adicionado com sucesso!');
        callback(null);
      });
    });
  }
}

function processItems(items) {
  if (items.length === 0) {
    showMessage('Todos os itens foram processados.');
    return;
  }

  const [item, ...remainingItems] = items;

  addItemToFile(filePath, item, (error) => {
    if (error) {
      showError('Erro ao adicionar item: ' + error.message);
      return;
    }
    processItems(remainingItems);
  });
}

function readJsonFiles(directory) {
  const files = fs.readdirSync(directory);
  const jsonFiles = files.filter(file => path.extname(file) === '.json');
  
  let combinedData = [];
  
  jsonFiles.forEach(file => {
    const filePath = path.join(directory, file);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      combinedData = combinedData.concat(jsonData);
    } catch (error) {
      showError(`Erro ao ler o arquivo ${file}: ${error.message}`);
    }
  });
  
  return combinedData;
}

const DB = readJsonFiles(TEMP_DIRECTORY);
const erDados = readJsonFiles(FIXED_DIRECTORY);

const combineData = (data) => {
  const combined = {};

  data.forEach(item => {
    const { id, ...rest } = item;

    if (!combined[id]) {
      combined[id] = { id };
    }

    combined[id] = { ...combined[id], ...rest };
  });

  return Object.values(combined).filter(item => (
    item.id && item.cpf && item.date && item.ip && item.port && item.username && item.password && item.email && item.submail && item.pass
  ));
};

const result = combineData(erDados);

function createItemKey(item) {
  return `${item.email.trim()}-${item.cpf.trim()}`;
}

function findNonMatchingResult(DB, result) {
  const dbKeys = new Set();

  DB.forEach(item => {
    const email = item.email.trim().toLowerCase();
    const cpf = item.cpf.trim();
    const ip = item.ip.trim();
    
    dbKeys.add(`${email}`);
    dbKeys.add(`${ip}`);
    dbKeys.add(`${cpf}`);
  });

  showMessage('Chaves do DB: ' + Array.from(dbKeys).join(', '));

  let nonMatchingResults = result.filter(item => {
    const email = item.email.trim().toLowerCase();
    const cpf = item.cpf.trim();
    const ip = item.ip.trim();
    
    const keyEmailCpf = `${email}`;
    const keyEmailIp = `${ip}`;
    const keyCpfIp = `${cpf}`;

    const isNonMatching = !dbKeys.has(keyEmailCpf) && !dbKeys.has(keyEmailIp) && !dbKeys.has(keyCpfIp);

    if (isNonMatching) {
      showMessage('Item não correspondente encontrado: ' + JSON.stringify(item));
    }

    return isNonMatching;
  });

  nonMatchingResults = removeDuplicates(nonMatchingResults);

  return nonMatchingResults;
}

function removeDuplicates(array) {
  const seenEmails = new Set();
  const seenCpfs = new Set();
  const seenIps = new Set();
  
  const itemsToRemove = new Set();

  array.forEach(item => {
    const email = item.email.trim().toLowerCase();
    const cpf = item.cpf.trim();
    const ip = item.ip.trim();

    if (seenEmails.has(email) || seenCpfs.has(cpf) || seenIps.has(ip)) {
      itemsToRemove.add(item);
    } else {
      seenEmails.add(email);
      seenCpfs.add(cpf);
      seenIps.add(ip);
    }
  });

  return array.filter(item => !itemsToRemove.has(item));
}

function printNonMatchingResult(DB, result) {
  let nonMatchingResults = findNonMatchingResult(DB, result);

  if (nonMatchingResults.length > 0) {
    showMessage('Dados não encontrados na lista DB:');
  } else {
    showMessage('Todos os dados da lista result foram encontrados na lista DB.');
  }

  return nonMatchingResults;
}

const nonMatchingResults = printNonMatchingResult(DB, result);

(async function processNonMatchingResults(nonMatchingResults) {
  const uniqueResults = removeDuplicates(nonMatchingResults);
  
  try {
    if (uniqueResults.length > 0) {
      const automationInstance = new Automation(username, password);

      for (const item of uniqueResults) {

        const profile = await automationInstance.getProfiles();
        const open = await automationInstance.openBrowser(profile.data[0].id);
        const  listProxies = await automationInstance.listProxies();

        const proxie = {
          id: listProxies.data[0].id,
          userId: listProxies.data[0].userId,
          name: `http://${item.username}:${item.password}@${item.ip}:${item.port}`,
          type: "http",
          host: item.ip,
          browser_profiles_count: 0,
          password: item.password,
          login: item.username,
          port: item.port,
          changeIpUrl: item.ip
        };

        await automationInstance.upDateProxy(proxie.id, proxie);

        const profileData = {
          id: profile.data[0].id,
          userId: profile.data[0].userId,
          name: 'Pixier',
          proxyId: proxie.id,
          proxy: proxie
        };

        await automationInstance.updateProfile(profile.data[0].id, profileData);

        const port = open.port;
        const wsEndpoint = open.wsEndpoint;

        const browser = await puppeteer.connect({
          browserWSEndpoint: `ws://127.0.0.1:${port}${wsEndpoint}`
        });

        const page = await browser.newPage();

       // await page.goto('https://accounts.google.com',{ waitUntil: 'networkidle2' });
        
        await page.goto('https://boom-bb.com/pt-BR/promo/esportcs/?utm_campaign=esports&utm_content=fnx&utm_medium=esports&utm_source=twitch&utm_term=fnx', { waitUntil: 'networkidle2' });
        
        await page.waitForTimeout(10000);
        await page.waitForSelector('[data-at="country-select"]');
        const elements = await page.$$('[data-at="country-select"]');

        if (elements.length > 0) {
            const lastElement = elements[elements.length - 1];
            await lastElement.click();
        } else {
            console.log('Nenhum elemento encontrado com o seletor [data-at="country-select"].');
        }

        await page.click('[data-at="dropdownItem_4"]');
        await page.type('input[name="personalData.taxIdentityId"]', '692.768.030-68');
        await page.type('input[name="personalData.birthdate"]', '08/12/1970');

        const checkboxSelector = 'input[type="checkbox"]';
        await page.waitForSelector(checkboxSelector);
        await page.evaluate((selector) => {
            const checkbox = document.querySelector(selector);
            if (checkbox && !checkbox.checked) {
                checkbox.click();
            }
        }, checkboxSelector);

        await page.waitForSelector('[data-at="btn"]');
        await page.click('[data-at="btn"]');

        

        await page.waitForSelector('[data-at="gmail"]');
        await page.click('[data-at="gmail"]');
      

        await page.waitForSelector('input[type="email"]')
        await page.type('input[type="email"]', 'neodias82@gmail.com', { delay: 20 })
        await page.click('#identifierNext')
      
        await page.waitForSelector('input[type="password"]', { visible: true })
        await page.type('input[type="password"]', 'Manasses@20004')
      
        await page.waitForSelector('#passwordNext', { visible: true })
        await page.click('#passwordNext')

       await page.waitForTimeout(1000);

      }

      console.log('Resultados únicos não encontrados na lista DB:', uniqueResults);
        
      processItems(uniqueResults);

    } else {
      console.log('Todos os dados da lista result foram encontrados na lista DB.');
    }

  } catch (error) {
    console.error('Erro ao processar resultados não encontrados:', error);
  }
})(nonMatchingResults);


   