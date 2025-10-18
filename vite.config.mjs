import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "./",
  server: { open: true },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        cart: resolve(__dirname, "cart/index.html"),
        checkout: resolve(__dirname, "checkout/index.html"),
        success: resolve(__dirname, "checkout/success.html"),
        product_listing: resolve(__dirname, "product_listing/index.html"),
        product_pages: resolve(__dirname, "product_pages/index.html"),
        my_events: resolve(__dirname, "my_events/index.html"),
        register_page: resolve(__dirname, "register_page/index.html"),
        search_results: resolve(__dirname, "search_results/index.html")
      }
    }
  }
});
