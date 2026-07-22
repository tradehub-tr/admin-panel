import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import txResize from "./plugins/txResize";
import nativeSelectPicker from "./plugins/nativeSelectPicker";
import "./assets/tailwind.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./assets/main.scss";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(txResize);
app.use(nativeSelectPicker);

// navigation store rail tıklayınca router.push yapabilsin
if (import.meta.env.DEV) {
  window.__router = router;
}

app.mount("#app");
