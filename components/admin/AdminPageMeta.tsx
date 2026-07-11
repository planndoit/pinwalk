"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface AdminPageMeta {
  title: string;
  description?: string;
}

interface AdminPageMetaContextValue {
  meta: AdminPageMeta;
  setPageMeta: (meta: AdminPageMeta) => void;
}

const AdminPageMetaContext = createContext<AdminPageMetaContextValue | null>(
  null
);

export function AdminPageMetaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [meta, setMeta] = useState<AdminPageMeta>({ title: "" });

  const setPageMeta = useCallback((next: AdminPageMeta) => {
    setMeta(next);
  }, []);

  const value = useMemo(
    () => ({ meta, setPageMeta }),
    [meta, setPageMeta]
  );

  return (
    <AdminPageMetaContext.Provider value={value}>
      {children}
    </AdminPageMetaContext.Provider>
  );
}

export function useAdminPageMeta() {
  const ctx = useContext(AdminPageMetaContext);
  if (!ctx) {
    throw new Error("useAdminPageMeta must be used within AdminPageMetaProvider");
  }
  return ctx;
}
