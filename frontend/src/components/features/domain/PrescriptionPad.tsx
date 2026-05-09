import React, { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { useAuth } from "@/app/contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface PrescriptionPadProps {
    patient: {
        name: string;
        age: number;
        sex: string;
    };
}

export const PrescriptionPad = ({ patient }: PrescriptionPadProps) => {
  const { t } = useTranslation();
    const [refills, setRefills] = useState<number | null>(null);
    const { user } = useAuth();
    const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const paperStyle: React.CSSProperties = {
        fontFamily: '"Courier Prime", monospace',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 40px rgba(0,0,0,0.02)',
    };

    return (
        <div className="w-full flex justify-center items-start font-sans">
            <div
                className="w-full max-w-[800px] min-h-[1056px] relative p-8 text-black transition-all duration-300 ease-in-out border border-slate-200"
                style={paperStyle}
            >
                {/* Header */}
                <header className="relative z-10 flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 text-sky-900">
                            <Stethoscope size={32} strokeWidth={2} />
                            <h1 className="text-3xl font-bold tracking-tighter" style={{ fontFamily: '"DM Mono", monospace' }}>{t('components.prescription_pad.netra_ai', "Netra AI")}</h1>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 tracking-wide font-sans uppercase font-semibold">{t('components.prescription_pad.virtual_clinic_prescription_1', "Virtual Clinic Prescription")}</p>
                    </div>
                    <div className="mt-2 flex items-baseline">
                        <span className="font-bold text-sm mr-2">{t('components.prescription_pad.date_2', "Date:")}</span>
                        <span className="border-b border-black/80 inline-block min-w-[120px] h-6 text-center font-bold text-base">{currentDate}</span>
                    </div>
                </header>

                {/* Doctor Info Box */}
                <section className="relative z-10 border-2 border-black p-4 mb-8 bg-white/50 backdrop-blur-sm shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-baseline">
                                <span className="font-bold text-lg text-sky-900 mr-2">{t('components.prescription_pad.dr_3', "Dr.")}</span>
                                <span className="border-b border-black/20 w-48 h-6 inline-block text-lg font-bold pl-2">{user?.name?.replace('Dr. ', '')}</span>
                            </div>
                            <p className="text-gray-800 flex items-center text-sm">
                                <span className="mr-2 font-bold">{t('components.prescription_pad.registration_no_4', "Registration No.:")}</span>
                                <span className="border-b border-black/20 w-32 h-5 inline-block text-center">{Math.floor(Math.random() * 90000) + 10000}</span>
                            </p>
                        </div>
                        <div className="md:text-right space-y-1">
                            <p className="font-bold text-base uppercase tracking-wide text-sky-900">{t('components.prescription_pad.contact_5', "Contact")}</p>
                            <p className="text-sm">{user?.email}</p>
                        </div>
                    </div>
                </section>

                {/* Patient Info */}
                <section className="relative z-10 flex flex-wrap justify-between items-start mb-8 text-base border-b-2 border-black/10 pb-4 gap-y-4">
                    <div className="w-full md:w-auto flex items-baseline">
                        <span className="font-bold text-gray-700 min-w-[100px]">{t('components.prescription_pad.patient_name_6', "Patient Name:")}</span>
                        <span className="border-b-2 border-dotted border-black inline-block min-w-[200px] ml-2 px-2 h-6 font-medium">{patient.name}</span>
                    </div>
                    <div className="w-full md:w-auto flex flex-wrap justify-start md:justify-end gap-6">
                        <div className="flex items-baseline">
                            <span className="font-bold text-gray-700">Age/Sex:</span>
                            <span className="border-b-2 border-dotted border-black inline-block min-w-[80px] ml-2 px-2 h-6 text-center font-medium">
                                {patient.age} / {patient.sex === 'Male' ? 'M' : 'F'}
                            </span>
                        </div>
                    </div>

                    <div className="w-full mt-2 flex items-baseline">
                        <span className="font-bold text-gray-700 min-w-[140px]">{t('components.prescription_pad.ai_diagnostics_7', "AI Diagnostics:")}</span>
                        <span className="border-b-2 border-dotted border-black flex-grow ml-2 h-6 px-2 font-medium">Iron-Deficiency Anemia (94% Confirm)</span>
                    </div>
                </section>

                {/* Prescription Body */}
                <section className="relative z-10 mb-8 min-h-[300px]">
                    <div className="overflow-hidden rounded-sm border border-black/20">
                        <table className="w-full text-left border-collapse bg-white/40">
                            <thead>
                                <tr className="border-b-2 border-black bg-gray-100/50 text-xs uppercase tracking-wider">
                                    <th className="py-2 px-3 border-r border-black/10">{t('components.prescription_pad.sno_8', "S.No.")}</th>
                                    <th className="py-2 px-3 border-r border-black/10">{t('components.prescription_pad.medication_name_9', "Medication Name")}</th>
                                    <th className="py-2 px-3 border-r border-black/10">{t('components.prescription_pad.dosage_10', "Dosage")}</th>
                                    <th className="py-2 px-3">{t('components.prescription_pad.frequency_11', "Frequency")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/10 text-sm">
                                <tr className="h-12 hover:bg-gray-50/30">
                                    <td className="py-2 px-3 border-r border-black/10 font-bold text-black/50">1</td>
                                    <td className="py-2 px-3 border-r border-black/10 font-bold">{t('components.prescription_pad.ferrous_sulfate_12', "Ferrous Sulfate")}</td>
                                    <td className="py-2 px-3 border-r border-black/10">325 mg</td>
                                    <td className="py-2 px-3">Once Daily (3 months)</td>
                                </tr>
                                <tr className="h-12 hover:bg-gray-50/30">
                                    <td className="py-2 px-3 border-r border-black/10 font-bold text-black/50">2</td>
                                    <td className="py-2 px-3 border-r border-black/10 font-bold">{t('components.prescription_pad.vitamin_c_13', "Vitamin C")}</td>
                                    <td className="py-2 px-3 border-r border-black/10">500 mg</td>
                                    <td className="py-2 px-3">{t('components.prescription_pad.with_iron_daily_14', "With Iron Daily")}</td>
                                </tr>
                                {[...Array(4)].map((_, idx) => (
                                    <tr key={idx + 3} className="h-12 hover:bg-gray-50/30">
                                        <td className="py-2 px-3 border-r border-black/10 font-bold text-black/30">{idx + 3}</td>
                                        <td className="py-2 px-3 border-r border-black/10"></td>
                                        <td className="py-2 px-3 border-r border-black/10"></td>
                                        <td className="py-2 px-3"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Advice */}
                <section className="relative z-10 mb-12 bg-white p-4 border-2 border-black rounded-sm h-[120px]">
                    <h3 className="font-bold text-sm mb-2 underline decoration-black/30 underline-offset-4 uppercase tracking-wider">Advice / Notes:</h3>
                    <p className="text-sm font-medium italic">{t('components.prescription_pad.increase_dietary_iron_take_15', "Increase dietary iron. Take supplements with orange juice. Return for follow-up bloodwork in 90 days.")}</p>
                </section>

                {/* Footer */}
                <footer className="relative z-10 mt-auto border-t-4 border-double border-black pt-6 flex justify-between items-end gap-8">
                    <div className="relative group">
                        <div className="border-b-2 border-black w-48 mb-1 h-12 flex items-end justify-center pb-1">
                            <span className="font-[signature] text-2xl text-blue-900 opacity-80" style={{ fontFamily: 'cursive' }}>
                                {user?.name}
                            </span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{t('components.prescription_pad.digitally_signed_by_doctor_16', "Digitally Signed By Doctor")}</p>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-4 mb-2 bg-gray-100/50 p-2 rounded border border-black/10">
                            <span className="font-bold text-sm uppercase">{t('components.prescription_pad.refills_17', "Refills:")}</span>
                            {[0, 1, 2, 3].map(num => (
                                <div key={num} onClick={() => setRefills(num)} className="flex items-center gap-1 cursor-pointer">
                                    <div className={`w-4 h-4 border-2 border-black flex items-center justify-center transition-colors ${refills === num ? 'bg-black text-white' : 'bg-white'}`}>
                                        {refills === num && <span className="text-[10px]">✓</span>}
                                    </div>
                                    <span className="font-bold text-sm">{num}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </footer>

                <div className="relative z-10 text-center text-[8px] text-gray-400 mt-8 font-sans uppercase tracking-widest border-t border-gray-200 pt-2">{t('components.prescription_pad.this_prescription_is_generated_18', "This prescription is generated from a Netra AI teleconsultation.")}</div>
            </div>
        </div>
    );
};
