import React from 'react';
import { MapPin, Briefcase, Award, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function JobCard({
  id,
  title,
  company,
  salary,
  province,
  sector,
  workType,
  jobType,
  nocCode,
  teerLevel,
  verdict,
  onApply
}) {
  const isVerified = verdict === 'Verified';

  return (
    <div 
      className="bg-white rounded-xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col justify-between relative"
      id={`job-card-${id}`}
    >
      {/* Target badge based on verdict */}
      <div className="absolute top-4 right-4">
        {isVerified ? (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
            <ShieldCheck size={12} className="text-emerald-500" />
            Verified by AI
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-100">
            <AlertTriangle size={12} className="text-amber-500" />
            Under Review
          </span>
        )}
      </div>

      <div className="mb-4">
        {/* Company Name */}
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1" id={`company-${id}`}>
          {company}
        </p>

        {/* Job Title */}
        <h3 className="text-[#0F172A] font-extrabold text-lg leading-snug hover:text-blue-600 transition-colors mb-3" id={`title-${id}`}>
          {title}
        </h3>

        {/* Dynamic Tags Row */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {sector && (
            <span className="text-[10px] bg-slate-100 text-[#0F172A] px-2 py-0.5 rounded-full font-medium border border-slate-200/50">
              {sector}
            </span>
          )}
          {workType && (
            <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold border border-sky-100">
              {workType}
            </span>
          )}
          {jobType && (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
              {jobType}
            </span>
          )}
          {nocCode && (
            <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-mono font-medium border border-amber-100 flex items-center gap-0.5">
              <Award size={10} />
              NOC {nocCode} (TEER {teerLevel ?? 'N/A'})
            </span>
          )}
        </div>
      </div>

      {/* Salary & Location row wrapper */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mb-5">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Target Pay Range</span>
          <span className="text-lg font-black text-blue-600 leading-none" id={`salary-${id}`}>
            {salary || 'Salary Disclosed On Request'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600 font-medium text-xs">
          <MapPin size={14} className="text-slate-400" />
          <span>{province}</span>
        </div>
      </div>

      {/* Apply Button */}
      <button
        id={`btn-apply-job-${id}`}
        onClick={() => onApply && onApply(id)}
        className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>Apply Now</span>
      </button>
    </div>
  );
}
