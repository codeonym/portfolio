import { BootSequence } from "@/components/system/boot-sequence";
import { ParticleField } from "@/components/system/particle-field";
import { DeviceGate } from "@/components/os/device-gate";
import { SystemOS } from "@/components/os/system-os";

export default function Home() {
  return (
    <DeviceGate>
      <BootSequence />
      <ParticleField />
      <SystemOS />
    </DeviceGate>
  );
}
