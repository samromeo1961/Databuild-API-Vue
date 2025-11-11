import { createRouter, createWebHashHistory } from 'vue-router';

// Use lazy loading for route components to enable code splitting
// Each route will be loaded only when accessed, reducing initial bundle size
const routes = [
  {
    path: '/',
    redirect: '/catalogue'
  },
  {
    path: '/catalogue',
    name: 'Catalogue',
    component: () => import('../components/Catalogue/CatalogueTab_updated.vue')
  },
  {
    path: '/recipes',
    name: 'Recipes',
    component: () => import('../components/Recipes/RecipesTab_updated.vue')
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: () => import('../components/Suppliers/SuppliersTab.vue')
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: () => import('../components/Contacts/ContactsTab.vue')
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('../components/Templates/TemplatesTab.vue')
  },
  {
    path: '/favourites',
    name: 'Favourites',
    component: () => import('../components/Favourites/FavouritesTab.vue')
  },
  {
    path: '/recents',
    name: 'Recents',
    component: () => import('../components/Recents/RecentsTab.vue')
  },
  {
    path: '/zztakeoff-web',
    name: 'zzTakeoff Web',
    component: () => import('../components/ZzTakeoff/ZzTakeoffWebTab_Window.vue')
  }
];

const router = createRouter({
  history: createWebHashHistory(), // Use hash mode for Electron file:// protocol
  routes
});

export default router;
