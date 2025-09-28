import React, { useState } from "react";
import axios from "axios";
// Use Vite environment variable directly
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL as string;

const initialState = {
  name: "",
  category: "",
  stock: "",
  minStock: "",
  price: "",
  unitPrice: "",
  units: "pieces",
  supplier: "",
  expiryDate: "",
  store: "",
  storeAlt: "",
  supplierId: "",
  supplierEntity: "",
  supplierEntityName: "",
  purchaseInvoiceId: "",
  supplierPurchaseInvoiceId: "",
  purchaseInvoiceDate: "",
  sku: "",
  skuAlt: "",
  manufacturer: "",
  manufacturerName: "",
  composition: "",
  compositionName: "",
  series: "",
  reservedQuantity: "",
  purchasePriceExclVAT: "",
  vat: "",
  divider: "",
  dividerCustom: "",
};

export default function AddProductForm() {
  const [form, setForm] = useState<{ [key: string]: string }>(initialState);
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Only send fields with values, but always include unitPrice and units
      const data = Object.fromEntries(
        Object.entries(form).filter(([_, v]) => v !== "")
      );

      // Ensure unitPrice and units are always included
      if (!data.unitPrice) data.unitPrice = "0";
      if (!data.units) data.units = "pieces";

      await axios.post(`${VITE_BASE_URL}/inventory`, data);
      setMessage("Product added successfully!");
      setForm(initialState);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setMessage(err.response?.data?.error || "Error adding product");
      } else {
        setMessage("Error adding product");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "auto" }}>
      <h2>Add Product</h2>
      {Object.keys(initialState).map((field) => (
        <div key={field} style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: "bold" }}>
            {field}
          </label>
          <input
            type={field.toLowerCase().includes("date") ? "date" : "text"}
            name={field}
            value={form[field] || ""}
            onChange={handleChange}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
      ))}
      <button
        type="submit"
        style={{ padding: "10px 20px", fontWeight: "bold" }}
      >
        Add Product
      </button>
      {message && (
        <p style={{ color: message.includes("success") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </form>
  );
}
