import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/",
        component: () => import("./pages/Home.vue"),
    }, 
    {
        path: "/zip-code-checker",
        component: () => import("./pages/ZipCodeChecker.vue"),
    },
    {
        path: "/soulmap",
        component: () => import("./pages/SoulMap.vue"),
    }
    // {
    //     path: "/",
    //     redirect: "/item/1"
    // },
    // {
    //     path: "/item/:id",
    //     component: () => import("./pages/ItemPage.vue"),
    // },
    // {
    //     path: "/cart",
    //     component: () => import("./pages/CartPage.vue"),
    // },
];


export default createRouter({
    history: createWebHistory(),
    routes,
});