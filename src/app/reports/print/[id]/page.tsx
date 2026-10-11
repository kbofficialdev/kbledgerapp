"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: string;
  notes?: string;
  customer: {
    name: string;
    customerCode: string;
    mobile: string;
    currentBalance: number;
    address?: string;
  };
  village: {
    name: string;
    code: string;
    taluk?: string;
    district?: string;
  };
  items: Array<{
    customItemId: string;
    name: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    lineTotal: number;
  }>;
}

export default function CarbonPrintReceiptPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const match = data.orders.find((o: any) => o.id === orderId || o.orderNumber === orderId);
          if (match) {
            setOrder({
              ...match,
              customer: {
                name: match.customerName,
                customerCode: match.customerCode,
                mobile: match.customerMobile,
                currentBalance: 0,
              },
              village: {
                name: match.villageName,
                code: match.villageCode,
              },
            });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center font-mono text-sm">Preparing carbon print slip...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-rose-600 font-mono text-sm">Receipt record not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 flex flex-col items-center">
      {/* Top Print Action Controls (Hidden in Print) */}
      <div className="w-full max-w-[80mm] mb-4 flex items-center justify-between no-print px-2">
        <button
          onClick={() => window.history.back()}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <button
          onClick={handlePrint}
          className="kb-btn-primary text-xs py-1.5 px-3"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Slip (80mm)</span>
        </button>
      </div>

      {/* 80mm Exact POS / Carbon Print Voucher Surface */}
      <div className="print-receipt-container bg-white w-full max-w-[80mm] p-4 text-black font-mono text-[11px] leading-tight shadow-md border border-slate-300">
        {/* Store Header */}
        <div className="text-center pb-2">
          <div className="text-sm font-extrabold tracking-wider uppercase">KB KHATA STORE</div>
          <div className="text-[10px]">SMART VILLAGE &amp; SHOP COMMERCE</div>
          <div className="text-[9px] text-neutral-600">Counter Invoice &amp; Khata Voucher</div>
        </div>

        <div className="border-t border-dashed border-black my-1.5"></div>

        {/* Bill Meta */}
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>Bill No:</span>
            <span className="font-bold">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date &amp; Time:</span>
            <span>{formatDateTime(order.orderDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Village:</span>
            <span className="font-bold">{order.village.name} ({order.village.code})</span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-bold">{order.customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Phone:</span>
            <span>{order.customer.mobile}</span>
          </div>
          <div className="flex justify-between">
            <span>Cust ID:</span>
            <span>{order.customer.customerCode}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-1.5"></div>

        {/* Line Items Table */}
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="border-b border-dashed border-black font-bold">
              <th className="py-1">Item</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-neutral-400">
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1 pr-1 truncate max-w-[90px]">
                  <div>{item.name}</div>
                  <div className="text-[8px] text-neutral-600">{item.customItemId}</div>
                </td>
                <td className="py-1 text-center whitespace-nowrap">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-1 text-right whitespace-nowrap">
                  ₹{item.pricePerUnit.toFixed(2)}
                </td>
                <td className="py-1 text-right font-bold whitespace-nowrap">
                  ₹{item.lineTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black my-1.5"></div>

        {/* Totals & Settlement Breakdown */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between font-bold text-xs">
            <span>GRAND TOTAL:</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>

          <div className="flex justify-between text-[10px]">
            <span>Payment Mode:</span>
            <span className="font-bold uppercase">
              {order.paymentType === "DEBIT" ? "Fully Paid (Debit)" : order.paymentType === "PARTIAL" ? "Partial Paid" : "Unpaid (Credit)"}
            </span>
          </div>

          <div className="flex justify-between text-[10px]">
            <span>Amount Paid Now (Debit):</span>
            <span className="font-bold">{formatCurrency(order.paidAmount)}</span>
          </div>

          <div className="flex justify-between text-[10px] font-bold">
            <span>Carried to Udhaar (Credit):</span>
            <span>{formatCurrency(order.creditAmount)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        {/* Footer Notes & Signatures */}
        <div className="pt-2 text-center text-[9px] space-y-1">
          <div>*** THANK YOU! VISIT AGAIN ***</div>
          <div className="text-[8px] text-neutral-600">Goods once sold cannot be returned without slip</div>
        </div>

        {/* Signatures */}
        <div className="mt-8 pt-2 flex justify-between text-[9px] border-t border-dotted border-black">
          <div>Customer Sign</div>
          <div>Authorized Sign</div>
        </div>
      </div>
    </div>
  );
}

