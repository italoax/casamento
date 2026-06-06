export function Input({ label, name, value, type = "text", required = false }: any) {
  return (
    <label>
      {label}
      <input name={name} type={type} defaultValue={value || ""} required={required} />
    </label>
  );
}
