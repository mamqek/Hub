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
        path: "/soul-map",
        component: () => import("./pages/soulmap/SoulMap.vue"),
        children: [
            {
                path: 'clients',
                component: () => import("./pages/soulmap/Clients.vue")
            },
            {
                path: 'new-client',
                component : () => import("./pages/soulmap/NewClient.vue")
            }
        ]
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