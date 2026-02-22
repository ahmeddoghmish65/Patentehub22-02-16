import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';

interface AuthPageProps {
  mode: 'login' | 'register' | 'reset-password';
  onNavigate: (page: string) => void;
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { login, register, resetPassword, checkUsername, isLoading, error, clearError } = useAuthStore();
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Username check state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reset password fields
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'newpass' | 'done'>('email');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  // Errors
  const [localError, setLocalError] = useState('');

  // Real-time username availability check with debounce
  useEffect(() => {
    if (!username.trim() || username.length < 3) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }
    setUsernameStatus('checking');
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    usernameCheckTimer.current = setTimeout(async () => {
      const result = await checkUsername(username);
      setUsernameStatus(result.available ? 'available' : 'taken');
      setUsernameSuggestions(result.suggestions || []);
    }, 600);
    return () => { if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(''); clearError();
    if (!email || !password) { setLocalError('يرجى ملء جميع الحقول'); return; }
    const success = await login(email, password);
    if (success) onNavigate('dashboard');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(''); clearError();
    if (!firstName.trim()) { setLocalError('يرجى إدخال الاسم الأول'); return; }
    if (!lastName.trim()) { setLocalError('يرجى إدخال اسم العائلة'); return; }
    if (!email) { setLocalError('يرجى إدخال البريد الإلكتروني'); return; }
    if (!password) { setLocalError('يرجى إدخال كلمة المرور'); return; }
    if (password.length < 6) { setLocalError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (password !== confirmPassword) { setLocalError('كلمة المرور وتأكيدها غير متطابقين'); return; }
    if (username.trim() && usernameStatus === 'taken') { setLocalError('اسم المستخدم مستخدم بالفعل، اختر اسماً آخر'); return; }
    if (username.trim() && usernameStatus === 'checking') { setLocalError('انتظر انتهاء التحقق من اسم المستخدم'); return; }
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const success = await register(email, password, fullName, username.trim() || undefined);
    if (success) {
      showEmailNotification('مرحباً بك في Patente Hub! 🎉', `تم إنشاء حسابك بنجاح على منصة Patente Hub. ابدأ رحلتك نحو رخصة القيادة الإيطالية الآن!`);
      onNavigate('dashboard');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(''); clearError();
    if (resetStep === 'email') {
      if (!email) { setLocalError('يرجى إدخال البريد الإلكتروني'); return; }
      // Check if email exists in DB
      const { getDB } = await import('@/db/database');
      const db = await getDB();
      const allUsers = await db.getAll('users');
      const found = allUsers.find((u: { email: string }) => u.email.toLowerCase() === email.toLowerCase());
      if (!found) { setLocalError('البريد الإلكتروني غير مسجل في النظام'); return; }
      // Generate code and store in DB with expiry
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedCode(code);
      // Store reset code with expiry in user record temporarily via localStorage (secure enough for local app)
      const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      localStorage.setItem(`reset_code_${email}`, JSON.stringify({ code, expiry }));
      setResetStep('code');
    } else if (resetStep === 'code') {
      // Verify against stored code
      try {
        const stored = JSON.parse(localStorage.getItem(`reset_code_${email}`) || '{}');
        if (!stored.code) { setLocalError('انتهت صلاحية الرمز، ابدأ من جديد'); return; }
        if (Date.now() > stored.expiry) { localStorage.removeItem(`reset_code_${email}`); setLocalError('انتهت صلاحية الرمز (10 دقائق)، ابدأ من جديد'); return; }
        if (resetCode !== stored.code) { setLocalError('الرمز غير صحيح'); return; }
      } catch { setLocalError('خطأ في التحقق، ابدأ من جديد'); return; }
      setResetStep('newpass');
    } else if (resetStep === 'newpass') {
      if (!newPassword) { setLocalError('يرجى إدخال كلمة المرور الجديدة'); return; }
      if (newPassword.length < 6) { setLocalError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
      if (newPassword !== confirmNewPassword) { setLocalError('كلمة المرور وتأكيدها غير متطابقين'); return; }
      const ok = await resetPassword(email, newPassword);
      if (ok) {
        localStorage.removeItem(`reset_code_${email}`);
        setResetStep('done');
      } else {
        setLocalError('حدث خطأ، يرجى المحاولة مجدداً');
      }
    }
  };

  const isLogin = mode === 'login';
  const isReset = mode === 'reset-password';

  return (
    <div className="min-h-screen flex">

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="directions_car" size={22} className="text-white" filled />
            </div>
            <span className="text-xl font-bold text-surface-900 group-hover:text-primary-600 transition-colors">Patente Hub</span>
          </button>

          <h1 className="text-2xl font-bold text-surface-900 mb-2">
            {isReset ? 'إعادة تعيين كلمة المرور' : isLogin ? 'مرحباً بعودتك!' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-surface-500 mb-6 text-sm">
            {isReset ? 'اتبع الخطوات لاستعادة حسابك' : isLogin ? 'سجّل دخولك لمتابعة التعلم' : 'سجّل مجاناً وابدأ رحلتك نحو الباتينتي'}
          </p>

          {(error || localError) && (
            <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <Icon name="error" size={20} />
              <span className="text-sm">{error || localError}</span>
            </div>
          )}

          {/* LOGIN */}
          {isLogin && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input label="البريد الإلكتروني" type="email" placeholder="example@email.com" icon="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-left" />
              <div className="relative">
                <Input label="كلمة المرور" type={showPassword ? 'text' : 'password'} placeholder="••••••••" icon="lock" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" className="text-left" />
                <button type="button" className="absolute left-3 top-9 text-surface-400 hover:text-surface-600" onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
              <Button type="submit" fullWidth size="lg" loading={isLoading}>تسجيل الدخول</Button>
              <div className="text-center space-y-2">
                <button type="button" className="block w-full text-sm text-primary-600 hover:text-primary-700" onClick={() => { setLocalError(''); clearError(); onNavigate('reset-password'); }}>
                  نسيت كلمة المرور؟
                </button>
                <p className="text-surface-500 text-sm">
                  ليس لديك حساب؟
                  <button type="button" className="text-primary-600 font-semibold hover:text-primary-700 mr-2" onClick={() => { setLocalError(''); clearError(); onNavigate('register'); }}>سجّل الآن</button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="الاسم الأول *" placeholder="أحمد" icon="person" value={firstName} onChange={e => setFirstName(e.target.value)} />
                <Input label="اسم العائلة *" placeholder="محمد" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <Input label="اسم المستخدم (اختياري)" placeholder="ahmed_m" icon="alternate_email" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} dir="ltr" className="text-left" />
              {/* Username status indicator */}
              {username.trim().length >= 3 && (
                <div className="-mt-2 mb-1">
                  {usernameStatus === 'checking' && (
                    <p className="text-xs text-surface-400 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-2 border-surface-300 border-t-primary-500 rounded-full animate-spin" />
                      جاري التحقق...
                    </p>
                  )}
                  {usernameStatus === 'available' && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Icon name="check_circle" size={14} filled /> متاح ✓
                    </p>
                  )}
                  {usernameStatus === 'taken' && (
                    <div>
                      <p className="text-xs text-danger-600 flex items-center gap-1 mb-1">
                        <Icon name="cancel" size={14} filled /> مستخدم بالفعل
                      </p>
                      {usernameSuggestions.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-surface-400">اقتراحات:</span>
                          {usernameSuggestions.map(s => (
                            <button key={s} type="button"
                              className="text-[10px] bg-primary-50 text-primary-600 border border-primary-200 px-2 py-0.5 rounded-full hover:bg-primary-100 transition-colors font-mono"
                              onClick={() => setUsername(s)}>
                              @{s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-surface-400 -mt-2">يستخدم فقط أحرف إنجليزية صغيرة، أرقام، نقطة أو شرطة سفلية</p>
              <Input label="البريد الإلكتروني *" type="email" placeholder="example@email.com" icon="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-left" />
              <div className="relative">
                <Input label="كلمة المرور *" type={showPassword ? 'text' : 'password'} placeholder="6 أحرف على الأقل" icon="lock" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" className="text-left" />
                <button type="button" className="absolute left-3 top-9 text-surface-400 hover:text-surface-600" onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
              <Input label="تأكيد كلمة المرور *" type="password" placeholder="أعد كتابة كلمة المرور" icon="lock" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} dir="ltr" className="text-left"
                error={confirmPassword && password !== confirmPassword ? 'كلمة المرور غير متطابقة' : undefined} />
              <Button type="submit" fullWidth size="lg" loading={isLoading}>إنشاء الحساب</Button>
              <p className="text-center text-surface-500 text-sm">
                لديك حساب بالفعل؟
                <button type="button" className="text-primary-600 font-semibold hover:text-primary-700 mr-2" onClick={() => { setLocalError(''); clearError(); onNavigate('login'); }}>سجّل الدخول</button>
              </p>
            </form>
          )}

          {/* RESET PASSWORD */}
          {isReset && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {['email', 'code', 'newpass'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      resetStep === step ? 'bg-primary-500 text-white' :
                      ['email', 'code', 'newpass'].indexOf(resetStep) > i || resetStep === 'done' ? 'bg-success-500 text-white' :
                      'bg-surface-200 text-surface-500'
                    }`}>
                      {['email', 'code', 'newpass'].indexOf(resetStep) > i || resetStep === 'done' ? '✓' : i + 1}
                    </div>
                    {i < 2 && <div className={`w-8 h-0.5 ${['email', 'code', 'newpass'].indexOf(resetStep) > i ? 'bg-success-500' : 'bg-surface-200'}`} />}
                  </div>
                ))}
              </div>

              {resetStep === 'email' && (
                <>
                  <p className="text-sm text-surface-600 text-center">أدخل بريدك الإلكتروني المسجل</p>
                  <Input label="البريد الإلكتروني" type="email" placeholder="example@email.com" icon="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-left" />
                  <Button type="submit" fullWidth size="lg">إرسال رمز التحقق</Button>
                </>
              )}

              {resetStep === 'code' && (
                <>
                  <div className="bg-primary-50 rounded-xl p-5 border border-primary-100 text-center">
                    <Icon name="lock_clock" size={32} className="text-primary-500 mx-auto mb-2" filled />
                    <p className="text-sm text-primary-700 font-bold mb-1">رمز التحقق الخاص بك</p>
                    <div className="text-3xl font-mono font-black text-primary-700 tracking-[0.3em] bg-white rounded-xl py-3 px-4 border-2 border-primary-200 inline-block mt-1 select-all">
                      {generatedCode}
                    </div>
                    <p className="text-[11px] text-primary-400 mt-2">صالح لمدة 10 دقائق · انسخه وأدخله أدناه</p>
                  </div>
                  <Input label="أدخل رمز التحقق" placeholder="6 أرقام" icon="pin" value={resetCode} onChange={e => setResetCode(e.target.value)} dir="ltr" className="text-left text-center tracking-widest" />
                  <Button type="submit" fullWidth size="lg">تحقق والمتابعة</Button>
                </>
              )}

              {resetStep === 'newpass' && (
                <>
                  <p className="text-sm text-surface-600 text-center">أدخل كلمة المرور الجديدة</p>
                  <Input label="كلمة المرور الجديدة" type="password" placeholder="6 أحرف على الأقل" icon="lock" value={newPassword} onChange={e => setNewPassword(e.target.value)} dir="ltr" className="text-left" />
                  <Input label="تأكيد كلمة المرور الجديدة" type="password" placeholder="أعد كتابة كلمة المرور" icon="lock" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} dir="ltr" className="text-left"
                    error={confirmNewPassword && newPassword !== confirmNewPassword ? 'كلمة المرور غير متطابقة' : undefined} />
                  <Button type="submit" fullWidth size="lg">تعيين كلمة المرور الجديدة</Button>
                </>
              )}

              {resetStep === 'done' && (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-success-50 rounded-full flex items-center justify-center">
                    <Icon name="check_circle" size={48} className="text-success-500" filled />
                  </div>
                  <h3 className="text-lg font-bold text-surface-900">تم بنجاح! 🎉</h3>
                  <p className="text-sm text-surface-500">تم تغيير كلمة المرور. يمكنك الآن تسجيل الدخول.</p>
                  <Button fullWidth onClick={() => onNavigate('login')}>تسجيل الدخول</Button>
                </div>
              )}

              {resetStep !== 'done' && (
                <p className="text-center text-surface-500 text-sm">
                  تذكرت كلمة المرور؟
                  <button type="button" className="text-primary-600 font-semibold mr-2" onClick={() => onNavigate('login')}>سجّل الدخول</button>
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Side illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="relative text-center max-w-lg">
          <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 border border-white/30">
            <Icon name="school" size={48} className="text-white" filled />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">تعلّم الباتينتي بالعربية</h2>
          <p className="text-primary-100 text-lg leading-relaxed">انضم لأكثر من 5000 عربي نجحوا في امتحان رخصة القيادة الإيطالية</p>
        </div>
      </div>
    </div>
  );
}
