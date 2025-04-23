
import React from "react";

export default function AuthPricingGrid() {
  return (
    <section className="w-full bg-gradient-to-b from-slate-100 via-slate-50 to-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl text-center font-bold mb-8">
          <span className="text-gray-800">Simple </span>
          <span className="text-primary">Pricing</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6 flex flex-col items-center">
            <div className="text-3xl font-bold text-primary mb-2">7 Days</div>
            <div className="text-lg font-semibold text-gray-700 mb-1">Free Trial</div>
            <div className="text-gray-500 text-center text-sm mb-1">
              No credit card needed
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6 flex flex-col items-center">
            <div className="text-3xl font-bold text-primary mb-2">30 Days</div>
            <div className="text-lg font-semibold text-gray-700 mb-1">Free Trial</div>
            <div className="text-gray-500 text-center text-sm mb-1">
              With credit card registration
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6 flex flex-col items-center">
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold text-primary">$7</span>
              <span className="text-gray-700 font-semibold text-xl">/mo</span>
            </div>
            <div className="text-lg font-semibold text-gray-700 mb-1">Simple Flat Rate</div>
            <div className="text-gray-500 text-center text-sm mb-1">
              After your free trial period <br /> Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
