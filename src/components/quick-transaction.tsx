"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDemo } from "@/lib/demo-store";
import { Button, FieldLabel, TextInput } from "@/components/ui";
import { addTransactionAction } from "@/actions/dashboard";

const movementSchema = z.object({
  name: z.string().trim().min(2, "Escribe una descripción."),
  amount: z.string().refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Ingresa un valor mayor que cero."),
  category: z.enum(["Alimentación", "Hogar", "Transporte", "Bienestar", "Ingresos"]),
  type: z.enum(["expense", "income"]),
});
type MovementForm = z.infer<typeof movementSchema>;

export function QuickTransaction({
  isLoggedIn = false,
  onSaved,
}: {
  isLoggedIn?: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { addTransaction: addDemoTransaction } = useDemo();
  const form = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { name: "", amount: "", category: "Ingresos", type: "income" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (isLoggedIn) {
        const res = await addTransactionAction({
          name: values.name,
          amount: Number(values.amount),
          category: values.category,
          type: values.type,
        });
        if (!res.success) {
          setErrorMessage(res.error || "Ocurrió un error al registrar el movimiento.");
          return;
        }
      } else {
        addDemoTransaction({
          name: values.name,
          amount: Number(values.amount),
          category: values.category,
          type: values.type,
          date: new Date().toISOString().slice(0, 10),
          account: "Cuenta principal",
        });
      }
      form.reset();
      setErrorMessage(null);
      setOpen(false);
      onSaved?.();
    } catch {
      setErrorMessage("Error de red o conexión. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="md">
          <Plus size={16} /> Añadir movimiento
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#10261e]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[calc(100%-28px)] max-w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-line bg-white p-5 shadow-float sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="font-display text-[23px] text-ink">
                Nuevo movimiento
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted">
                {isLoggedIn
                  ? "Se registrará en tu cuenta de Hogar en la base de datos."
                  : "Se guardará solo en esta demostración local."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas" aria-label="Cerrar">
              <X size={16} />
            </Dialog.Close>
          </div>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}
            <div>
              <FieldLabel htmlFor="movement-name">Descripción</FieldLabel>
              <TextInput id="movement-name" placeholder="Ej. Sueldo, Saldo inicial, Mercado..." {...form.register("name")} />
              {form.formState.errors.name && <p className="mt-1 text-[10px] text-rose">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="movement-amount">Valor en COP ($)</FieldLabel>
                <TextInput id="movement-amount" inputMode="numeric" placeholder="150000" {...form.register("amount")} />
                {form.formState.errors.amount && <p className="mt-1 text-[10px] text-rose">{form.formState.errors.amount.message}</p>}
              </div>
              <div>
                <FieldLabel htmlFor="movement-type">Tipo</FieldLabel>
                <select id="movement-type" className="focus-ring h-[42px] w-full rounded-xl border border-line bg-white px-3 text-sm text-ink" {...form.register("type")}><option value="income">Ingreso (+)</option><option value="expense">Gasto (−)</option></select>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="movement-category">Categoría</FieldLabel>
              <select id="movement-category" className="focus-ring h-[42px] w-full rounded-xl border border-line bg-white px-3 text-sm text-ink" {...form.register("category")}><option value="Ingresos">Ingresos</option><option value="Hogar">Hogar</option><option value="Alimentación">Alimentación</option><option value="Transporte">Transporte</option><option value="Bienestar">Bienestar</option></select>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar movimiento"
              )}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
