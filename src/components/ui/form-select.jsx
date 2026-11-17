import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Remplaçant direct du select natif basé sur les primitives Radix : mêmes enfants <option>,
 * même onChange(event) avec event.target.value, même comportement pour une valeur inconnue
 * (la première option s'affiche) et pour une option vide (value="").
 */
const EMPTY_VALUE = "__form_select_empty__";

const textOf = (node) =>
  React.Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      return React.isValidElement(child) ? textOf(child.props.children) : "";
    })
    .join("");

function collectOptions(children, options = []) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "option") {
      if (child.props.hidden) return;
      const label = textOf(child.props.children);
      const value = child.props.value === undefined ? label : String(child.props.value ?? "");
      options.push({ value, label, disabled: !!child.props.disabled });
    } else {
      collectOptions(child.props.children, options);
    }
  });
  return options;
}

const FormSelect = React.forwardRef(function FormSelect(
  { value, defaultValue, onChange, disabled, required, name, className, children, ...triggerProps },
  ref
) {
  const [innerValue, setInnerValue] = React.useState(defaultValue);
  const current = String((value !== undefined ? value : innerValue) ?? "");
  const options = collectOptions(children);
  const match = options.find((option) => option.value === current);
  const selected = match || options.find((option) => !option.disabled);
  const selectedValue = selected ? selected.value : "";

  const handleChange = (next) => {
    const nextValue = next === EMPTY_VALUE ? "" : next;
    const target = { value: nextValue, name };
    setInnerValue(nextValue);
    onChange?.({ target, currentTarget: target, preventDefault() {}, stopPropagation() {}, persist() {} });
  };

  return (
    <Select value={selectedValue} onValueChange={handleChange} disabled={disabled} name={name}>
      {/* Validation du formulaire : le champ caché de Radix accepte à tort une option vide. */}
      {required && !disabled && (
        <input
          required
          tabIndex={-1}
          aria-hidden="true"
          value={selectedValue}
          onChange={() => {}}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />
      )}
      <SelectTrigger ref={ref} data-form-select="" className={cn("bg-background text-left", className)} {...triggerProps}>
        <SelectValue placeholder={selected?.label || ""} />
      </SelectTrigger>
      <SelectContent className="z-[1000] max-h-72">
        {options.map((option, index) => (
          <SelectItem key={`${option.value}-${index}`} value={option.value === "" ? EMPTY_VALUE : option.value} disabled={option.disabled} textValue={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

export { FormSelect };
