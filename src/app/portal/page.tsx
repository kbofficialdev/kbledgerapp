"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  Smartphone,
  Search,
  Users,
  MapPin,
  ArrowRight,
  CreditCard,
  QrCode,
  ShieldCheck,
  Receipt,
  BookOpen,
  IndianRupee,
  Phone,
  KeyRound,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CustomerAvatar } from "@/components/common/Avatars";
import { VoiceCalloutButton } from "@/components/common/VoiceCalloutButton";

interface CustomerSummary {
  id: string;
  name: string;
  customerCode: string;
  mobile: string;
  villageName: string;
  villageCode: string;
  currentBalance: number;
  creditLimit: number;
  orderCount: number;
}

function CustomerPortalDirectory() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.customerCode.toLowerCase().includes(q) ||
      c.villageName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>Customer Self-Service Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Customer Khata Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Access your offline store bills, itemized line totals, bahi-khata ledger statement, and settle outstanding balances directly using Google Pay UPI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/login"
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>Sign in with Mobile OTP</span>
          </Link>

          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
              G
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Instant UPI Settlement</span>
              <p className="text-xs font-semibold text-slate-800">Verified Google Pay Merchant Account</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="kb-card-elevated p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Enter your Mobile Number, Customer Name, or Khata Code to access account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="kb-input pl-10 text-sm font-medium"
            autoFocus
          />
        </div>
      </div>

      {/* Customer Account Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Available Customer Khata Accounts ({filtered.length})
          </span>
          <span className="text-xs text-slate-500 font-medium">Click any account to view bills &amp; pay</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <span>Loading accounts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="kb-card-elevated p-12 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No matching account found</p>
            <p className="text-xs text-slate-500">
              Please check the mobile number or register as a new customer at the counter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((cust) => (
              <div
                key={cust.id}
                className="kb-card-elevated p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-lg transition-all duration-200 group"
              >
                <div>
                  {/* Header: Name and Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CustomerAvatar name={cust.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cust.name}
                          </h3>
                          <VoiceCalloutButton
                            payload={{
                              customerName: cust.name,
                              villageName: cust.villageName,
                              amount: cust.currentBalance,
                              paymentType: "CREDIT",
                            }}
                            variant="badge"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                            {cust.customerCode}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-sans">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cust.mobile}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Village Info */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium">{cust.villageName}</span>
                    <span className="text-slate-400 font-mono">({cust.villageCode})</span>
                  </div>

                  {/* Balance Display */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Outstanding Udhaar
                      </span>
                      <span
                        className={`text-lg font-black font-mono ${
                          cust.currentBalance > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(cust.currentBalance)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Counter Bills
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {cust.orderCount || 0} Slips
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Full Khata Ledger</span>
                  <Link
                    href={`/portal/${cust.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all group-hover:translate-x-0.5"
                  >
                    <span>View &amp; Pay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-mono text-xs">Loading Customer Portal...</div>}>
      <CustomerPortalDirectory />
    </Suspense>
  );
}

