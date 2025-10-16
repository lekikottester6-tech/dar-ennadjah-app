import React, { useState } from 'react';
import { Student, User, Grade, Attendance, Observation } from '../../types';
import { SCHOOL_LOGO_URL } from '../../constants';
import UserIcon from '../../components/icons/UserIcon';
import PrintIcon from '../../components/icons/PrintIcon';
import Button from '../../components/common/Button';

interface PrintableStudentFileProps {
    student: Student;
    parent: User | undefined;
    grades: Grade[];
    attendance: Attendance[];
    observations: Observation[];
    onClose: () => void;
}

const PrintableStudentFile: React.FC<PrintableStudentFileProps> = ({ student, parent, grades, attendance, observations, onClose }) => {
    
    const [manualAverage, setManualAverage] = useState<string>('');

    const handlePrint = () => {
        window.print();
    };

    const InfoItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div className="flex flex-col sm:flex-row py-1">
            <p className="font-semibold w-full sm:w-48 flex-shrink-0">{label} :</p>
            <p className="text-slate-700">{value}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-200 z-50 overflow-y-auto">
            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 2cm;
                        }
                        body {
                            background-color: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #printable-area, #printable-area * {
                            visibility: visible;
                        }
                        #printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: auto;
                            margin: 0;
                            padding: 0;
                            border: none;
                            box-shadow: none;
                            border-radius: 0;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                    .break-inside-avoid {
                        break-inside: avoid;
                    }
                `}
            </style>
            
            {/* Top Control Bar */}
            <div className="no-print w-full bg-white/80 backdrop-blur-sm border-b border-slate-200 p-3 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-10">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 text-center sm:text-left">Aperçu avant impression</h3>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="manual-average" className="text-sm font-medium text-slate-700 whitespace-nowrap">Moy. Générale:</label>
                        <input 
                            id="manual-average"
                            type="text" 
                            value={manualAverage} 
                            onChange={(e) => setManualAverage(e.target.value)} 
                            className="w-24 p-1 border border-slate-300 rounded-md text-sm focus:ring-royal-blue focus:border-royal-blue"
                            placeholder="Ex: 15.75"
                        />
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto">
                         <Button onClick={handlePrint} size="sm" className="w-full text-xs sm:text-sm">
                            <PrintIcon className="mr-2"/> Imprimer / PDF
                        </Button>
                        <Button onClick={onClose} variant="secondary" size="sm" className="w-full text-xs sm:text-sm">Fermer</Button>
                    </div>
                </div>
            </div>

            {/* Document Preview */}
            <div className="p-2 sm:p-8">
                 <div 
                    id="printable-area" 
                    className="bg-white sm:rounded-lg sm:shadow-2xl p-4 sm:p-8 md:p-12 mx-auto my-0 sm:my-8 w-full max-w-none sm:max-w-4xl lg:max-w-[21cm]"
                >
                    {/* Header */}
                    <header className="flex justify-between items-center border-b-2 border-royal-blue pb-4 mb-8">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-royal-blue">Fiche de Suivi Élève</h1>
                            <p className="text-slate-500 text-sm">Année {new Date().getFullYear()}-{new Date().getFullYear() + 1}</p>
                        </div>
                        <img src={SCHOOL_LOGO_URL} alt="Logo" className="h-16 w-16 md:h-20 md:w-20 rounded-full" />
                    </header>
                    
                    {/* Student Info */}
                    <section className="mb-8 break-inside-avoid">
                        <h2 className="text-xl font-semibold text-slate-700 border-b pb-2 mb-4">Informations Personnelles</h2>
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-200 shadow-md flex-shrink-0 mx-auto sm:mx-0">
                                {student.photoUrl ? (
                                    <img className="h-full w-full rounded-full object-cover" src={student.photoUrl} alt={`Photo de ${student.prenom}`} />
                                ) : (
                                    <UserIcon className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" />
                                )}
                            </div>
                            <div className="text-sm space-y-1 w-full">
                                <InfoItem label="Nom Complet" value={`${student.prenom} ${student.nom}`} />
                                <InfoItem label="Date de Naissance" value={new Date(student.dateNaissance).toLocaleDateString('fr-FR')} />
                                <InfoItem label="Classe" value={student.classe} />
                                <InfoItem label="Niveau Scolaire" value={student.niveauScolaire || 'Non spécifié'} />
                                <InfoItem label="Parent Associé" value={parent?.nom || 'N/A'} />
                                <InfoItem label="Contact Parent" value={parent?.telephone || 'N/A'} />
                            </div>
                        </div>
                    </section>
                    
                    {/* Grades */}
                    <section className="mb-8 break-inside-avoid">
                        <h2 className="text-xl font-semibold text-slate-700 border-b pb-2 mb-4">Résultats Scolaires</h2>
                        {manualAverage.trim() && (
                            <div className="text-right mb-4 bg-royal-blue/10 p-2 rounded-md">
                                <span className="font-semibold text-royal-blue">Moyenne Générale Saisie : </span>
                                <span className="font-bold text-lg text-royal-blue">{manualAverage}</span>
                            </div>
                        )}
                        {grades.length > 0 ? (
                             <div className="space-y-3">
                                {grades.map(g => (
                                    <div key={g.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 break-inside-avoid">
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold text-base text-slate-800">{g.matiere}</span>
                                            <span className="font-bold text-lg text-royal-blue whitespace-nowrap">{g.note}/20</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap justify-between items-center gap-x-4">
                                            <span>{g.date ? `Le ${new Date(g.date).toLocaleDateString('fr-FR')}` : 'N/A'}</span>
                                            <span className="font-medium">Coeff: {g.coefficient}</span>
                                            <span>{g.periode}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500 italic text-center py-4">Aucune note enregistrée.</p>}
                    </section>
                    
                     {/* Observations */}
                    <section className="break-inside-avoid">
                        <h2 className="text-xl font-semibold text-slate-700 border-b pb-2 mb-4">Observations de l'Administration</h2>
                        {observations.length > 0 ? (
                           <div className="space-y-4">
                               {observations.map(obs => (
                                    <div key={obs.id} className="p-3 bg-slate-50 rounded-md border text-sm break-inside-avoid">
                                        <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                                            <span>Le : <strong>{new Date(obs.date).toLocaleDateString('fr-FR')}</strong></span>
                                        </div>
                                        <p className="text-slate-700 whitespace-pre-wrap">{obs.content}</p>
                                    </div>
                               ))}
                           </div>
                        ) : <p className="text-slate-500 italic text-center py-4">Aucune observation enregistrée.</p>}
                    </section>

                     {/* Footer */}
                    <footer className="mt-12 pt-4 border-t text-center text-xs text-slate-400">
                        Document généré le {new Date().toLocaleDateString('fr-FR')} - École Dar Ennadjah
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default PrintableStudentFile;