async function BackendStatus() {
  try {
    const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/v1/health`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return <span className="text-red-600">No disponible</span>;
    }

    const data = (await res.json()) as { status?: string };

    return (
      <span className={data.status === 'ok' ? 'text-emerald-600' : 'text-red-600'}>
        {data.status === 'ok' ? 'Conectado' : 'Error'}
      </span>
    );
  } catch {
    return <span className="text-red-600">No disponible</span>;
  }
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Plataforma para eventos
        </p>
        <h1 className="text-4xl font-bold text-foreground sm:text-5xl">SalonFacil</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
          Encuentra el local perfecto para tu evento en El Alto.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm text-card-foreground shadow-sm">
          <span className="font-medium">Backend status:</span>
          <BackendStatus />
        </div>
      </section>
    </main>
  );
}
