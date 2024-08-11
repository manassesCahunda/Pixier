const axios = require('axios');
const qs = require('qs');

class Automation {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.apiUrl = 'https://dolphin-anty-api.com';
    }

    async auth() {
        try {
            const response = await axios.post('https://anty-api.com/auth/login', {
                username: this.username,
                password: this.password
            });
            return response.data.token || false;
        } catch (error) {
            console.error('Erro de autenticação:', error);
            return false;
        }
    }

    async getProfiles() {
        const token = await this.auth();
        if (!token) {
            console.log('Token não obtido');
            return;
        }

        try {
            const response = await axios.get(`${this.apiUrl}/browser_profiles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao obter perfis:', error);
        }
    }

    async openBrowser(profileId) {
        try {
            const response = await axios.get(`http://localhost:3001/v1.0/browser_profiles/${profileId}/start?automation=1`);
            return response.data.automation;
        } catch (error) {
            console.error('Erro ao abrir o navegador:', error);
        }
    }

    async updateProfile(profileId, profileData) {
        const data = qs.stringify(profileData);
        const token = await this.auth();
        if (!token) {
            console.log('Token não obtido');
            return;
        }

        try {
            const response = await axios.patch(`${this.apiUrl}/browser_profiles/${profileId}`, data, {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('Perfil atualizado:', response.data);
        } catch (error) {
            console.error('Erro ao atualizar o perfil:', error);
        }
    }

    async upDateProxy(ProxyId, proxyData) {
        const data = qs.stringify(proxyData);
        const token = await this.auth();
        if (!token) {
            console.log('Token não obtido');
            return;
        }
        try {
            const response = await axios.patch(`${this.apiUrl}/proxy/${ProxyId}`, data, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'  
                }
            });
            return response.data;
        } catch (error) {
            console.error('Erro ao atualizar o proxy:', error);
        }
    }

    async listProxies() {
        const token = await this.auth();
        if (!token) {
            console.log('Token não obtido');
            return;
        }
        try {
            const response = await axios.get(`${this.apiUrl}/proxy`,
                 {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/x-www-form-urlencoded'  
                    }
                });
                
           return response.data;

        } catch (error) {
            console.error('Erro ao listar proxies:', error);
        }
    }

    async deleteProxy(proxyId) {
        try {
            const response = await axios.delete(`${this.apiUrl}/proxy/${proxyId}`);
            console.log('Proxy deletado:', response.data);
        } catch (error) {
            console.error('Erro ao deletar o proxy:', error);
        }
    }
}

module.exports = Automation;
