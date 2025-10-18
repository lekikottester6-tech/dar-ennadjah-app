import React, { useState } from 'react';
import { UserRole, User } from '../types';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { SCHOOL_LOGO_URL, SCHOOL_ADDRESS, SCHOOL_EMAIL, SCHOOL_PHONE_PRIMARY, SCHOOL_PHONE_SECONDARY, GOOGLE_MAPS_EMBED_URL, FACEBOOK_URL, INSTAGRAM_URL } from '../constants';
import * as api from '../api';
import InformationCircleIcon from '../components/icons/InformationCircleIcon';
import MapPinIcon from '../components/icons/MapPinIcon';
import AtSymbolIcon from '../components/icons/AtSymbolIcon';
import PhoneIcon from '../components/icons/PhoneIcon';
import FacebookIcon from '../components/icons/FacebookIcon';
import InstagramIcon from '../components/icons/InstagramIcon';


interface LoginScreenProps {
  onLogin: (user: User) => void;
}

type View = 'role_select' | 'parent_login' | 'admin_login' | 'visitor';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<View>('role_select');

  const handleLogin = async (role: UserRole) => {
    setError('');
    setLoading(true);

    if (role === UserRole.ADMIN) {
        try {
            const user = await api.adminLogin({ password });
            onLogin(user);
        } catch (error: any) {
            setError(error.message || 'La connexion a échoué. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
        return;
    }
    
    if (role === UserRole.PARENT) {
        try {
            const user = await api.parentLogin({ email, password });
            onLogin(user);
        } catch (error: any) {
            setError(error.message || 'La connexion a échoué. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    }
  };
  
  const changeView = (view: View) => {
      setActiveView(view);
      setError('');
      setPassword('');
      setEmail('');
  }

  const renderRoleSelection = () => (
      <div className="flex flex-col space-y-4">
          <h3 className="text-center font-semibold text-slate-700">Je suis...</h3>
          <Button onClick={() => changeView('parent_login')} className="w-full py-3 text-base font-bold">
              Parent
          </Button>
          <Button onClick={() => changeView('admin_login')} variant="secondary" className="w-full py-3 text-base font-bold">
              Admin
          </Button>
          <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-sm">OU</span>
              <div className="flex-grow border-t border-slate-200"></div>
          </div>
          <Button onClick={() => changeView('visitor')} variant="ghost" className="w-full py-2 text-base">
              Espace Visiteur
          </Button>
      </div>
  );

  const renderLoginForm = (role: UserRole.PARENT | UserRole.ADMIN) => (
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(role); }}>
          <div className="text-center">
              <h3 className="text-2xl font-bold text-royal-blue">
                  {role === UserRole.PARENT ? "Espace Parent" : "Espace Admin"}
              </h3>
              <div className="mt-2 w-12 h-1 bg-accent-yellow rounded-full mx-auto"></div>
          </div>
          <div className="space-y-4">
              {role === UserRole.PARENT && (
                  <div>
                      <label htmlFor="email" className="sr_only">Email</label>
                      <input id="email" name="email" type="email" autoComplete="email" required
                          className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-royal-blue focus:border-royal-blue focus:z-10 sm:text-sm"
                          placeholder="Adresse Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
              )}
              <div>
                  <label htmlFor="password" className="sr_only">Mot de passe</label>
                  <input id="password" name="password" type="password" autoComplete="current-password" required
                      className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-royal-blue focus:border-royal-blue focus:z-10 sm:text-sm"
                      placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div className="flex flex-col space-y-3 pt-1">
              <Button type="submit" className="w-full py-3 text-base font-bold" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
              <Button variant="ghost" onClick={() => changeView('role_select')} className="w-full py-2" disabled={loading}>
                  Retour
              </Button>
          </div>
      </form>
  );

  const renderVisitorArea = () => (
      <div className="fade-in space-y-6">
        <div className="text-center">
            <h3 className="text-2xl font-bold text-royal-blue">Espace Visiteur</h3>
            <div className="mt-2 w-12 h-1 bg-accent-yellow rounded-full mx-auto"></div>
        </div>
        <Card className="border-l-4 border-accent-yellow bg-slate-50/50">
            <h4 className="font-bold text-lg text-royal-blue mb-2">À propos de nous</h4>
            <div className="text-sm text-slate-600 space-y-3">
                <p>Bienvenue à Dar Ennadjah, un établissement privé dédié à l’excellence académique et à l’épanouissement personnel.</p>
                <p>Notre mission est de révéler le potentiel de chaque élève à travers une pédagogie exigeante, humaine et tournée vers l’avenir.</p>
                <p>Guidés par nos valeurs — respect, persévérance et curiosité — nous accompagnons nos apprenants à devenir des citoyens éclairés et confiants dans leurs capacités.</p>
                <p>À Dar Ennadjah, nous ne préparons pas seulement les élèves à réussir à l’école, mais à réussir dans la vie.</p>
            </div>
        </Card>
        <Card className="border-l-4 border-accent-yellow bg-slate-50/50">
             <h4 className="font-bold text-lg text-royal-blue mb-2">Notre Emplacement</h4>
             <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden border border-slate-200">
                 <iframe 
                    src={GOOGLE_MAPS_EMBED_URL}
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen={false} 
                    loading="lazy"
                    title="Emplacement de l'école Dar Ennadjah"
                  ></iframe>
             </div>
        </Card>
        <Card className="border-l-4 border-accent-yellow bg-slate-50/50">
            <h4 className="font-bold text-lg text-royal-blue mb-3">Contact & Informations</h4>
            <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start">
                    <MapPinIcon className="w-5 h-5 mr-3 text-royal-blue flex-shrink-0 mt-0.5"/>
                    <span>{SCHOOL_ADDRESS}</span>
                </li>
                <li className="flex items-center">
                    <AtSymbolIcon className="w-5 h-5 mr-3 text-royal-blue flex-shrink-0"/>
                    <a href={`mailto:${SCHOOL_EMAIL}`} className="text-royal-blue hover:underline">{SCHOOL_EMAIL}</a>
                </li>
                <li className="flex items-start">
                    <PhoneIcon className="w-5 h-5 mr-3 text-royal-blue flex-shrink-0 mt-0.5"/>
                    <div>
                        <p>
                            <span className="font-semibold">Préscolaire-Primaire :</span>
                            <a href={`tel:${SCHOOL_PHONE_PRIMARY.replace(/\s/g, '')}`} className="ml-1 text-royal-blue hover:underline">{SCHOOL_PHONE_PRIMARY}</a>
                        </p>
                        <p>
                            <span className="font-semibold">Collège-Lycée :</span>
                            <a href={`tel:${SCHOOL_PHONE_SECONDARY.replace(/\s/g, '')}`} className="ml-1 text-royal-blue hover:underline">{SCHOOL_PHONE_SECONDARY}</a>
                        </p>
                    </div>
                </li>
            </ul>
             <div className="flex items-center space-x-4 pt-4 mt-4 border-t border-slate-200">
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-royal-blue transition"><FacebookIcon/></a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-royal-blue transition"><InstagramIcon/></a>
            </div>
        </Card>
        <Button variant="ghost" onClick={() => changeView('role_select')} className="w-full py-2">
            Retour
        </Button>
      </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
            <img src={SCHOOL_LOGO_URL} alt="Dar Ennadjah Logo" className="mx-auto h-24 w-24 rounded-full shadow-lg border-4 border-white"/>
            <div>
              <h2 className="mt-5 text-3xl font-bold text-royal-blue">
                Dar Ennadjah
              </h2>
              <div className="mt-2 w-16 h-1 bg-accent-yellow rounded-full mx-auto"></div>
            </div>
          <p className="mt-3 text-sm text-slate-600">
            Bienvenue. Connectez-vous ou découvrez notre école.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-md">
            {activeView === 'role_select' && renderRoleSelection()}
            {activeView === 'parent_login' && renderLoginForm(UserRole.PARENT)}
            {activeView === 'admin_login' && renderLoginForm(UserRole.ADMIN)}
            {activeView === 'visitor' && renderVisitorArea()}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;