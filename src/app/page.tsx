import { BootSequence } from "@/components/system/boot-sequence";
import { DeviceGate } from "@/components/os/device-gate";
import { SystemOS } from "@/components/os/system-os";
import { SystemScene } from "@/components/three/system-scene";

export default function Home() {
  return (
    <DeviceGate>
      <BootSequence />
      <SystemScene />
      <SystemOS />
    </DeviceGate>
  );
}
