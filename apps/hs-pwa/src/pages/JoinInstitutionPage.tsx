import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Building2, Key, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const JoinInstitutionPage: React.FC = () => {
  const { joinInstitution, institution, membership } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (institution) {
      if (!membership?.defaultScheduleRecordId) {
        navigate('/select-profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [institution, membership, navigate]);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await joinInstitution(code.trim().toUpperCase());
      toast.success('Joined college successfully!');
      navigate('/select-profile');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        'Invalid or expired institution code. Please check with your college administrator.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between px-4 sm:px-8 py-8 text-slate-100">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-14 py-6 md:py-12">
        {/* Left Side: Onboarding Information for Desktop & Tablet */}
        <div className="flex-1 max-w-lg text-center md:text-left space-y-6">
          <div className="inline-flex p-3.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Building2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">
              Step 1 of 2 • Institution Onboarding
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Join Your Medical College
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Every medical college and affiliated hospital operates in an isolated environment. Enter the official access code provided by your internship coordinator to access your college's clinical rotations.
            </p>
          </div>

          {/* Quick Steps Guide */}
          <div className="space-y-3 pt-2 text-left">
            <div className="flex items-start space-x-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-200">1. Obtain Access Code:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Contact your medical college coordinator or check the official notice board.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-200">2. Verify & Join:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Submit the code to securely enroll your Google account into the college.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-200">3. Select Schedule Profile:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Pick your name from the verified roster to load your postings.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Access Code Entry Card */}
        <div className="w-full max-w-md bg-slate-900 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md shrink-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                College Access Code
              </label>
              <div className="relative">
                <Key className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. KMC-8F4A-92B1"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-750 rounded-xl text-white font-mono text-center tracking-widest text-base font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Format: <code>COL-XXXX-XXXX</code> or your college prefix code.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || code.length < 4}
              className="w-full flex items-center justify-center py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm disabled:opacity-50"
            >
              <span>{submitting ? 'Verifying Code...' : 'Join College'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Secure Institution Enrollment</span>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-600 py-2">
        Designed for House Surgeons in Indian Medical Colleges
      </footer>
    </div>
  );
};
