"use client";

import React from "react";
import { hospitalConfig } from "@/config/hospital";

export default function PrintOPDBillPage() {
  return (
    <div className="p-8 font-sans max-w-2xl mx-auto text-center">
      <h1 className="text-xl font-bold">OPD Bill of Supply</h1>
      <p className="text-sm text-gray-500 mt-2">{hospitalConfig.name} OPD Receipt</p>
    </div>
  );
}
