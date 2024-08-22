import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from '@/stores/userStore';


const routes = [
    {
        path: "/auth",
        component: () => import("./pages/Authorization.vue"),
    }, 
    {
        path: "/",
        component: () => import("./pages/Home.vue"),
    }, 
    {
        path: "/zip-code-checker",
        component: () => import("./pages/ZipCodeChecker.vue"),
        meta: { requiresAuth: true}
    },
    {
        path: "/soul-map",
        component: () => import("./pages/soulmap/SoulMap.vue"),
        meta: { requiresAuth: true, requiredRole: 'soulUser' }, // This route requires the 'admin' role
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
    },
    {
        path: "/unauthorized",
        name: 'Unauthorized',
        component: () => import("./pages/Unauthorized.vue"),
    },
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


const router =  createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const isAuthenticated = useUserStore().authenticated;
    const userRole = useUserStore().getAttribute('role');

    if (to.meta.requiresAuth && !isAuthenticated) {
        // Redirect to unauthorized if the route requires auth and the user isn't authenticated
        return next({ 
            name: 'Unauthorized',
            query: {reason: "authentication"}
        });
    }

    if (to.meta.requiredRole && to.meta.requiredRole !== userRole) {
        // Redirect to unauthorized if the user doesn't have the required role
        return next({ 
            name: 'Unauthorized',
            query: {reason: "role"}
        });
    }

    next(); // Proceed to the route
});

export default router;