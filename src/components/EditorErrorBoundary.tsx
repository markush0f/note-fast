import { Component, type ErrorInfo, type ReactNode } from "react";
import { WarningCircle } from "./icons";
import { Button } from "./ui";

export default class EditorErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("No se pudo cargar el editor", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
      <WarningCircle className="text-muted" size={24} />
      <h2 className="text-base font-medium">No se pudo cargar el editor</h2>
      <p className="max-w-80 text-[13px] text-muted">Actualiza la ventana para volver a intentarlo. Tu cuaderno guardado no se ha borrado.</p>
      <Button variant="primary" onClick={() => window.location.reload()}>Recargar aplicación</Button>
    </section>;
  }
}
