import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import txResize from "./plugins/txResize";
import "./assets/main.scss";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(txResize);

// navigation store rail tıklayınca router.push yapabilsin
window.__router = router;

app.mount("#app");
