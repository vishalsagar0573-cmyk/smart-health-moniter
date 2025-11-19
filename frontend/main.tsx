import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MissingEnvNotice = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-semibold">Supabase Configuration Required</h1>
      <p className="text-muted-foreground">
        The frontend can&apos;t start because Supabase environment variables are missing.
        Please add <code className="font-mono">VITE_SUPABASE_URL</code> and
        <code className="font-mono"> VITE_SUPABASE_ANON_KEY</code> to your <code className="font-mono">.env.local</code> file,
        then restart <code className="font-mono">npm run dev</code>.
      </p>
      <div className="text-left text-sm bg-muted/50 border rounded-md p-4 space-y-2 font-mono">
        <p>.env.local</p>
        <p>VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co</p>
        <p>VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY</p>
      </div>
      <p className="text-sm text-muted-foreground">
        After updating the file, stop the dev server and start it again so Vite picks up the new values.
      </p>
    </div>
  </div>
);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  root.render(<MissingEnvNotice />);
} else {
  import("./App.tsx")
    .then(({ default: App }) => {
      root.render(<App />);
    })
    .catch((error) => {
      console.error("Failed to load App component:", error);
      root.render(
        <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold mb-4">Unable to load the app</h1>
            <p className="text-muted-foreground">
              Please check the console for details.
            </p>
          </div>
        </div>
      );
    });
}
