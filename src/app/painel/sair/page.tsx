"use client";

import { useEffect } from "react";

export default function SairPainelPage() {
  useEffect(() => {
    fetch("/api/painel/logout", { method: "POST" }).finally(() => {
      window.location.href = "/painel/login";
    });
  }, []);
  return <main style={{ padding: 40 }}>Saindo...</main>;
}
