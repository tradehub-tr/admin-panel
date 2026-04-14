import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// navigation store rail tıklayınca router.push yapabilsin
window.__router = router

app.mount('#app')
