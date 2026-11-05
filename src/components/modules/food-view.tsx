"use client";

import { useState, useTransition } from "react";
import { Card, Button, Badge } from "@/components/ui";
import {
  Wheat,
  Plus,
  Trash2,
  Edit2,
  ShoppingCart,
  Copy,
  ChevronLeft,
  ChevronRight,
  Flame,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { getMondayOfCurrentWeek } from "@/lib/utils";
import {
  type DayOfWeek,
  type MealType,
  type WeeklyMealPlanData,
  type MealItemData,
  type MealIngredient,
  getWeeklyMealPlanAction,
  addMealItemAction,
  updateMealItemAction,
  deleteMealItemAction,
  copyPreviousWeekMealPlanAction,
  sendIngredientsToShoppingListAction,
} from "@/actions/meals";

const DAYS_OF_WEEK: DayOfWeek[] = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DAY_LABELS: Record<DayOfWeek, string> = {
  LUN: "Lunes",
  MAR: "Martes",
  MIÉ: "Miércoles",
  JUE: "Jueves",
  VIE: "Viernes",
  SÁB: "Sábado",
  DOM: "Domingo",
};

const MEAL_TYPES: MealType[] = ["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena"];

function formatWeekRange(startDateStr: string) {
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return `Semana del ${start.getDate()} de ${months[start.getMonth()]} al ${end.getDate()} de ${months[end.getMonth()]}`;
}

function shiftWeek(startDateStr: string, days: number): string {
  const d = new Date(startDateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FoodView({
  isReal,
  initialPlan,
}: {
  isReal: boolean;
  initialPlan?: WeeklyMealPlanData | null;
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    initialPlan?.weekStartDate || getMondayOfCurrentWeek()
  );
  const [plan, setPlan] = useState<WeeklyMealPlanData | null>(initialPlan || null);
  const [activeDay, setActiveDay] = useState<DayOfWeek>("LUN");
  const [isPending, startTransition] = useTransition();

  // Modals & Feedback
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MealItemData | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [formDay, setFormDay] = useState<DayOfWeek>("LUN");
  const [formMealType, setFormMealType] = useState<MealType>("Almuerzo");
  const [formDishName, setFormDishName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPortions, setFormPortions] = useState(2);
  const [formInstructions, setFormInstructions] = useState("");
  const [formCalories, setFormCalories] = useState(0);
  const [formIngredients, setFormIngredients] = useState<Array<{ name: string; quantity: number; unit: string }>>([]);

  const refreshPlan = (targetDate = currentWeekStart) => {
    startTransition(async () => {
      const res = await getWeeklyMealPlanAction(targetDate);
      if (res.success && res.plan) {
        setPlan(res.plan);
      }
    });
  };

  const handlePrevWeek = () => {
    const nextDate = shiftWeek(currentWeekStart, -7);
    setCurrentWeekStart(nextDate);
    refreshPlan(nextDate);
  };

  const handleNextWeek = () => {
    const nextDate = shiftWeek(currentWeekStart, 7);
    setCurrentWeekStart(nextDate);
    refreshPlan(nextDate);
  };

  const handleCurrentWeek = () => {
    const todayMonday = getMondayOfCurrentWeek();
    setCurrentWeekStart(todayMonday);
    refreshPlan(todayMonday);
  };

  const openAddModal = (day: DayOfWeek = activeDay, type: MealType = "Almuerzo") => {
    setEditingItem(null);
    setFormDay(day);
    setFormMealType(type);
    setFormDishName("");
    setFormDescription("");
    setFormPortions(2);
    setFormInstructions("");
    setFormCalories(0);
    setFormIngredients([{ name: "", quantity: 1, unit: "unidades" }]);
    setShowModal(true);
  };

  const openEditModal = (item: MealItemData) => {
    setEditingItem(item);
    setFormDay(item.dayOfWeek);
    setFormMealType(item.mealType);
    setFormDishName(item.dishName);
    setFormDescription(item.description || "");
    setFormPortions(item.portions);
    setFormInstructions(item.instructions || "");
    setFormCalories(item.calories);
    setFormIngredients(
      item.ingredients.length > 0
        ? item.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit }))
        : [{ name: "", quantity: 1, unit: "unidades" }]
    );
    setShowModal(true);
  };

  const handleAddIngredientRow = () => {
    setFormIngredients([...formIngredients, { name: "", quantity: 1, unit: "unidades" }]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== idx));
  };

  const handleSaveMealItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDishName.trim()) {
      setFeedback({ type: "error", message: "El nombre del plato es obligatorio." });
      return;
    }

    const cleanIngredients = formIngredients
      .filter((i) => i.name.trim() !== "")
      .map((i) => ({
        name: i.name.trim(),
        quantity: Number(i.quantity) || 1,
        unit: i.unit.trim().toLowerCase() || "unidades",
      }));

    if (editingItem) {
      const res = await updateMealItemAction({
        id: editingItem.id,
        dayOfWeek: formDay,
        mealType: formMealType,
        dishName: formDishName,
        description: formDescription,
        portions: formPortions,
        instructions: formInstructions,
        calories: formCalories,
        ingredients: cleanIngredients,
      });

      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "No se pudo actualizar el plato." });
        return;
      }
      setFeedback({ type: "success", message: "Plato actualizado con éxito en MySQL." });
    } else {
      const res = await addMealItemAction({
        weekStartDate: currentWeekStart,
        dayOfWeek: formDay,
        mealType: formMealType,
        dishName: formDishName,
        description: formDescription,
        portions: formPortions,
        instructions: formInstructions,
        calories: formCalories,
        ingredients: cleanIngredients,
      });

      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "No se pudo registrar el plato." });
        return;
      }
      setFeedback({ type: "success", message: "Plato guardado correctamente en la base de datos." });
    }

    setShowModal(false);
    refreshPlan();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Deseas eliminar este plato del menú semanal?")) return;
    const res = await deleteMealItemAction(id);
    if (!res.success) {
      setFeedback({ type: "error", message: res.error || "No se pudo eliminar el plato." });
      return;
    }
    setFeedback({ type: "success", message: "Plato eliminado correctamente." });
    refreshPlan();
  };

  const handleCopyPreviousWeek = async () => {
    if (!confirm("¿Deseas copiar todos los platos de la semana anterior a la semana actual?")) return;
    startTransition(async () => {
      const res = await copyPreviousWeekMealPlanAction(currentWeekStart);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "No se pudo copiar la semana anterior." });
        return;
      }
      setFeedback({
        type: "success",
        message: `Se copiaron ${res.copiedCount} platos exitosamente desde la semana anterior.`,
      });
      refreshPlan();
    });
  };

  const handleSendToShopping = async (mealItemId?: string) => {
    startTransition(async () => {
      const res = await sendIngredientsToShoppingListAction({
        planId: plan?.id,
        mealItemId,
      });

      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "No se pudieron enviar los ingredientes a compras." });
        return;
      }

      setFeedback({
        type: "success",
        message: `Ingredientes consolidados en tu Lista de Compras: +${res.addedCount} nuevos, ${res.updatedCount} actualizados (${res.totalIngredients} ingredientes en total).`,
      });
    });
  };

  const items = plan?.items || [];
  const currentDayItems = items.filter((item) => item.dayOfWeek === activeDay);

  // Group items by meal type for active day
  const itemsByType = MEAL_TYPES.reduce((acc, type) => {
    acc[type] = currentDayItems.filter((i) => i.mealType === type);
    return acc;
  }, {} as Record<MealType, MealItemData[]>);

  const totalWeekIngredients = items.reduce((sum, item) => sum + item.ingredients.length, 0);

  return (
    <div className="animate-fade-up space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-forest">ALIMENTACIÓN & MENÚ</span>
            <Badge tone="green">{isReal ? "MySQL Aiven Cloud" : "Demo"}</Badge>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">Menú Semanal</h1>
          <p className="mt-1 text-xs text-muted">
            Planifica tus comidas, organiza ingredientes y sincroniza automáticamente con tu lista de compras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopyPreviousWeek}
            disabled={isPending}
            className="flex items-center gap-1.5"
          >
            <Copy size={13} />
            Copiar semana ant.
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleSendToShopping()}
            disabled={isPending || items.length === 0}
            className="flex items-center gap-1.5 border-forest/30 text-forest hover:bg-forest/10"
            title="Consolidar todos los ingredientes de la semana en la lista de compras"
          >
            <ShoppingCart size={13} />
            Compras ({totalWeekIngredients} ing.)
          </Button>

          <Button
            size="sm"
            onClick={() => openAddModal(activeDay, "Almuerzo")}
            className="flex items-center gap-1.5"
          >
            <Plus size={14} />
            Planificar plato
          </Button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-muted hover:text-ink">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Selector de Semana */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handlePrevWeek} disabled={isPending} className="h-8 w-8 p-0">
            <ChevronLeft size={16} />
          </Button>
          <span className="font-semibold text-ink">{formatWeekRange(currentWeekStart)}</span>
          <Button size="sm" variant="secondary" onClick={handleNextWeek} disabled={isPending} className="h-8 w-8 p-0">
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCurrentWeek}
            className="text-[11px] font-semibold text-forest underline-offset-4 hover:underline"
          >
            Semana en curso
          </button>
          <span className="text-muted">·</span>
          <span className="text-[11px] text-muted">
            {items.length} {items.length === 1 ? "plato registrado" : "platos registrados"}
          </span>
        </div>
      </Card>

      {/* Barra de Días */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAYS_OF_WEEK.map((day) => {
          const dayCount = items.filter((i) => i.dayOfWeek === day).length;
          const isActive = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex min-w-[72px] flex-1 flex-col items-center justify-center rounded-xl border py-2.5 px-2 transition-all ${
                isActive
                  ? "border-forest bg-forest text-white shadow-sm"
                  : "border-line bg-card text-muted hover:border-forest/40 hover:text-ink"
              }`}
            >
              <span className={`text-[10px] font-bold ${isActive ? "text-white" : "text-forest"}`}>{day}</span>
              <span className="mt-0.5 text-xs font-semibold">{DAY_LABELS[day]}</span>
              <span
                className={`mt-1 rounded-full px-1.5 py-0.2 text-[9px] font-medium ${
                  isActive ? "bg-white/20 text-white" : "bg-canvas text-muted"
                }`}
              >
                {dayCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista de Comidas del Día Seleccionado */}
      <div className="space-y-4">
        {MEAL_TYPES.map((type) => {
          const mealsOfType = itemsByType[type] || [];
          return (
            <div key={type} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-forest" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink">{type}</h3>
                  <span className="text-[10px] text-muted">({mealsOfType.length})</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openAddModal(activeDay, type)}
                  className="h-7 text-[11px] px-2.5 flex items-center gap-1"
                >
                  <Plus size={12} />
                  Añadir
                </Button>
              </div>

              {mealsOfType.length === 0 ? (
                <div className="py-5 text-center text-xs text-muted">
                  No hay recetas programadas para {type.toLowerCase()} el {DAY_LABELS[activeDay].toLowerCase()}.
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {mealsOfType.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col justify-between rounded-xl border border-line bg-canvas p-3.5 transition-all hover:border-forest/40"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-ink">{item.dishName}</h4>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => openEditModal(item)}
                              className="rounded p-1 text-muted hover:bg-card hover:text-ink"
                              title="Editar plato"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="rounded p-1 text-muted hover:bg-card hover:text-red-600"
                              title="Eliminar plato"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {item.description && (
                          <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <Users size={12} className="text-forest" />
                            {item.portions} porciones
                          </span>
                          {item.calories > 0 && (
                            <span className="flex items-center gap-1">
                              <Flame size={12} className="text-amber-500" />
                              {item.calories} kcal
                            </span>
                          )}
                        </div>

                        {/* Ingredientes */}
                        {item.ingredients.length > 0 && (
                          <div className="mt-3 border-t border-line/60 pt-2.5">
                            <span className="text-[10px] font-bold uppercase text-muted">Ingredientes:</span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {item.ingredients.map((ing, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-0.5 text-[10px] text-ink"
                                >
                                  <span>{ing.name}</span>
                                  <span className="font-semibold text-forest">
                                    ({ing.quantity} {ing.unit})
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.instructions && (
                          <div className="mt-2.5 rounded-lg bg-card/60 p-2 text-[11px] text-muted">
                            <span className="font-semibold text-ink">Preparación: </span>
                            {item.instructions}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 flex items-center justify-end border-t border-line/40">
                        <button
                          onClick={() => handleSendToShopping(item.id)}
                          className="flex items-center gap-1 text-[11px] font-medium text-forest hover:underline"
                        >
                          <ShoppingCart size={12} />
                          Mandar a compras
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Añadir / Editar Plato */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl border border-line animate-fade-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif text-lg font-bold text-ink">
                {editingItem ? "Editar Plato" : "Nuevo Plato para el Menú"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMealItem} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-ink">Día de la semana</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value as DayOfWeek)}
                    className="focus-ring h-9 w-full rounded-xl border border-line bg-canvas px-3 text-ink"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d} - {DAY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-ink">Momento de comida</label>
                  <select
                    value={formMealType}
                    onChange={(e) => setFormMealType(e.target.value as MealType)}
                    className="focus-ring h-9 w-full rounded-xl border border-line bg-canvas px-3 text-ink"
                  >
                    {MEAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-ink">Nombre de la receta o plato *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Salmón al horno con verduras"
                  value={formDishName}
                  onChange={(e) => setFormDishName(e.target.value)}
                  className="focus-ring h-9 w-full rounded-xl border border-line bg-canvas px-3 text-ink"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-ink">Descripción corta</label>
                <input
                  type="text"
                  placeholder="Ej: Plato ligero bajo en calorías"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="focus-ring h-9 w-full rounded-xl border border-line bg-canvas px-3 text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-ink">Porciones</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formPortions}
                    onChange={(e) => setFormPortions(Number(e.target.value))}
                    className="focus-ring h-9 w-full rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-ink">Calorías estimadas (kcal)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCalories}
                    onChange={(e) => setFormCalories(Number(e.target.value))}
                    className="focus-ring h-9 w-full rounded-xl border border-line bg-canvas px-3 text-ink"
                  />
                </div>
              </div>

              {/* Ingredientes dinámicos */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-ink">Ingredientes para compras</label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-[11px] font-semibold text-forest hover:underline"
                  >
                    + Añadir ingrediente
                  </button>
                </div>
                <div className="space-y-2">
                  {formIngredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ingrediente (ej: Tomates)"
                        value={ing.name}
                        onChange={(e) => {
                          const updated = [...formIngredients];
                          updated[idx].name = e.target.value;
                          setFormIngredients(updated);
                        }}
                        className="focus-ring h-8 flex-1 rounded-lg border border-line bg-canvas px-2.5 text-xs text-ink"
                      />
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder="Cant."
                        value={ing.quantity}
                        onChange={(e) => {
                          const updated = [...formIngredients];
                          updated[idx].quantity = Number(e.target.value);
                          setFormIngredients(updated);
                        }}
                        className="focus-ring h-8 w-16 rounded-lg border border-line bg-canvas px-2 text-xs text-ink text-center"
                      />
                      <input
                        type="text"
                        placeholder="Unidad (kg, g, uds)"
                        value={ing.unit}
                        onChange={(e) => {
                          const updated = [...formIngredients];
                          updated[idx].unit = e.target.value;
                          setFormIngredients(updated);
                        }}
                        className="focus-ring h-8 w-24 rounded-lg border border-line bg-canvas px-2 text-xs text-ink"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientRow(idx)}
                        className="rounded p-1 text-muted hover:bg-canvas hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-ink">Instrucciones o notas de preparación</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Precalentar el horno a 180°C durante 15 minutos..."
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="focus-ring w-full rounded-xl border border-line bg-canvas p-2.5 text-ink leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <Button size="sm" variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button size="sm" type="submit">
                  {editingItem ? "Actualizar Plato" : "Guardar Plato"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
