const puppeteer = require('puppeteer-core')
const axios = require('axios')
const config = require('config')

const username = config.get('username')
const password = config.get('password')


export const auth = async () => {
    const options = {
        method: "post",
        url: "https://anty-api.com/auth/login",
        data: {
            username, password
        }
    }
    const response = await axios(options)

    if (response.data.token)
        return response.data.token
    return false
}


export const getProfiles = async token => {
    const options = {
        url: "https://anty-api.com/browser_profiles",
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    const {data} = await axios(options)

    if (data && data.data.length > 0) {
        const ids = data.data.map(el => el.id)
        return ids
    }
    return false
}

export const openBrowser = async profileId => {
    const {data} = await axios(`http://localhost:3001/v1.0/browser_profiles/${profileId}/start?automation=1`)
    return data.automation
}


(async() => {
    const token = await auth()
    if (!token) {
        console.log('Токен не получен')
        return
    }
    const profilesIds = await getProfiles(token)
    if (!profilesIds) {
        console.log('Профили отсутствуют')
        return
    }

    for(let i = 0; i < profilesIds.length; i++) {
        automation(profilesIds[i])
    }
})()
