import { LoadingScreen, TitleScreen } from "@/components/hud/intro-screens";
import { WorldHud } from "@/components/hud/world-hud";
import { WorldCanvas } from "@/components/world/world-canvas";

export default function Home() {
  return (
    <main className="grain relative h-dvh w-full overflow-hidden">
      <WorldCanvas />
      <WorldHud />
      <TitleScreen />
      <LoadingScreen />
    </main>
  );
}
