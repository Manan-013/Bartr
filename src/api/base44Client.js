import { createClient } from "@base44/sdk";

// Create a Base44 client instance
const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
});

export { base44 };