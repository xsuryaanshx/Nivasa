import { forwardRef } from "react";
import { formatMoney, useCurrency } from "@/lib/currency";

interface Props {
  tenant: any;
  room: any;
  landlordName: string;
  landlordAddress: string;
  customTerms?: string[];
}

export const LeaseTemplate = forwardRef<HTMLDivElement, Props>(({ tenant, room, landlordName, landlordAddress, customTerms }, ref) => {
  const { currency } = useCurrency();
  const dateObj = tenant?.joined_at ? new Date(tenant.joined_at) : new Date();
  const formattedDate = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  
  const rent = tenant?.rent_amount || room?.rent || 0;
  const deposit = tenant?.depositAmount || 0;

  // Render a term with bolded title if it has a colon
  const renderTerm = (term: string) => {
    const colonIdx = term.indexOf(':');
    if (colonIdx > -1) {
      const title = term.slice(0, colonIdx + 1);
      const rest = term.slice(colonIdx + 1);
      return <><strong className="mr-1">{title}</strong>{rest}</>;
    }
    return term;
  };

  return (
    <div 
      ref={ref} 
      id="print-lease-container" 
      className="hidden print:block absolute top-0 left-0 w-full min-h-screen bg-white text-black p-10 sm:p-16 font-serif text-sm leading-relaxed"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2 uppercase tracking-wide">Rental Agreement</h1>
        <p className="text-center mb-8 text-xs text-gray-500 uppercase tracking-widest">(11-Month Lease)</p>

        <p className="mb-6">
          This Rental Agreement is made and executed on this <strong>{formattedDate}</strong>, by and between:
        </p>

        <div className="mb-6 pl-4 border-l-2 border-gray-300">
          <p><strong>{landlordName || "[Landlord Name]"}</strong>,</p>
          <p>Residing at {landlordAddress || "[Landlord Address]"},</p>
          <p className="text-gray-600 italic">Hereinafter referred to as the <strong>"Landlord"</strong> (which expression shall mean and include his/her heirs, legal representatives, administrators, and assigns) of the <strong>ONE PART</strong>.</p>
        </div>

        <p className="text-center font-bold mb-6 uppercase tracking-wider text-gray-400 text-xs">AND</p>

        <div className="mb-8 pl-4 border-l-2 border-gray-300">
          <p><strong>{tenant?.name || "[Tenant Name]"}</strong>,</p>
          <p>Aadhar / ID Number: {tenant?.aadhar || "[ID Number]"},</p>
          <p>Contact: {tenant?.phone || "[Phone]"},</p>
          <p className="text-gray-600 italic">Hereinafter referred to as the <strong>"Tenant"</strong> (which expression shall mean and include his/her heirs, legal representatives, administrators, and assigns) of the <strong>SECOND PART</strong>.</p>
        </div>

        <p className="mb-6">
          <strong>WHEREAS</strong> the Landlord is the absolute owner of the property situated at <strong>{room?.buildingName || "[Building Name]"}</strong>, specifically Room Number <strong>{room?.number || "[Room Number]"}</strong> (hereinafter referred to as the "Scheduled Premises").
        </p>
        <p className="mb-8">
          <strong>AND WHEREAS</strong> the Tenant has requested the Landlord to let out the Scheduled Premises on a residential rental basis, and the Landlord has agreed to do so under the following terms and conditions:
        </p>

        <h2 className="text-lg font-bold mb-4 uppercase border-b pb-2">Terms & Conditions</h2>

        <ol className="list-decimal pl-5 space-y-4 mb-10 text-justify">
          {(customTerms || []).map((term, i) => (
            <li key={i}>{renderTerm(term)}</li>
          ))}
        </ol>

        <p className="mb-12 text-justify">
          <strong>IN WITNESS WHEREOF</strong>, the parties hereto have set their respective hands and signed this Rental Agreement on the day, month, and year first above written.
        </p>

        <div className="flex justify-between mt-16 px-4">
          <div className="text-center">
            <div className="w-48 h-px bg-black mb-2 mx-auto"></div>
            <p className="font-bold">Landlord Signature</p>
            <p className="text-xs text-gray-500 mt-1">{landlordName || "[Landlord Name]"}</p>
          </div>
          <div className="text-center">
            <div className="w-48 h-px bg-black mb-2 mx-auto"></div>
            <p className="font-bold">Tenant Signature</p>
            <p className="text-xs text-gray-500 mt-1">{tenant?.name || "[Tenant Name]"}</p>
          </div>
        </div>

        <div className="mt-20 px-4">
          <h3 className="font-bold mb-6">Witnesses:</h3>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="mb-8">1. _________________________________</p>
              <p className="text-xs text-gray-500">Name & Address:</p>
            </div>
            <div>
              <p className="mb-8">2. _________________________________</p>
              <p className="text-xs text-gray-500">Name & Address:</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

LeaseTemplate.displayName = "LeaseTemplate";
