import React from "react";
import { generateCsrfToken } from "@/lib/csrf";

interface AdminFormContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminFormContainer({
  children,
  title,
  subtitle,
}: AdminFormContainerProps) {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>

      <div className="bg-white border rounded-lg p-6">{children}</div>
    </div>
  );
}

interface AdminFormProps {
  children: React.ReactNode;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

export function AdminForm({ children, onSubmit }: AdminFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {children}
    </form>
  );
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  defaultValue?: string | number;
  children?: React.ReactNode;
  minLength?: number;
  maxLength?: number;
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  error,
  placeholder,
  defaultValue,
  children,
  minLength,
  maxLength,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      {children ? (
        children
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          minLength={minLength}
          maxLength={maxLength}
          className={`w-full px-3 py-2 border rounded transition ${
            error
              ? "border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          }`}
        />
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormButtonGroupProps {
  submitLabel?: string;
  cancelHref?: string;
  isLoading?: boolean;
}

export function FormButtonGroup({
  submitLabel = "Save",
  cancelHref,
  isLoading = false,
}: FormButtonGroupProps) {
  return (
    <div className="flex gap-4 pt-2">
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isLoading ? "Loading…" : submitLabel}
      </button>

      {cancelHref && (
        <a href={cancelHref} className="px-6 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition">
          Cancel
        </a>
      )}
    </div>
  );
}
interface CsrfInputProps {
  token: string;
}

/**
 * Hidden input for CSRF token
 * Include this in all forms that modify data
 */
export function CsrfInput({ token }: CsrfInputProps) {
  return <input type="hidden" name="_csrf" value={token} />;
}

/**
 * Server component that generates and returns a CSRF token
 * Use this to get a token for rendering CSRF inputs
 */
export async function getCsrfInputComponent() {
  const token = generateCsrfToken();
  return <CsrfInput token={token} />;
}