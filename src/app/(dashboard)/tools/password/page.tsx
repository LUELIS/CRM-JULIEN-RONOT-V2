"use client"

import { useState, useCallback } from "react"
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
  Zap,
  Lock,
  AlertTriangle,
} from "lucide-react"

export default function PasswordGeneratorPage() {
  const [password, setPassword] = useState("")
  const [length, setLength] = useState(16)
  const [includeUppercase, setIncludeUppercase] = useState(true)
  const [includeLowercase, setIncludeLowercase] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(true)
  const [history, setHistory] = useState<string[]>([])

  const generatePassword = useCallback(() => {
    let chars = ""

    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const numbers = "0123456789"
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    const ambiguous = "0O1lI"

    if (includeLowercase) chars += lowercase
    if (includeUppercase) chars += uppercase
    if (includeNumbers) chars += numbers
    if (includeSymbols) chars += symbols

    if (excludeAmbiguous) {
      chars = chars.split("").filter(c => !ambiguous.includes(c)).join("")
    }

    if (chars.length === 0) {
      chars = lowercase // Fallback
    }

    let result = ""
    const array = new Uint32Array(length)
    crypto.getRandomValues(array)

    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }

    setPassword(result)
    setCopied(false)

    // Add to history (max 10)
    setHistory(prev => [result, ...prev.slice(0, 9)])
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeAmbiguous])

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: "Aucun", color: "#999999" }

    let score = 0

    // Length scoring
    if (pwd.length >= 8) score += 1
    if (pwd.length >= 12) score += 1
    if (pwd.length >= 16) score += 1
    if (pwd.length >= 20) score += 1

    // Character variety
    if (/[a-z]/.test(pwd)) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1

    if (score <= 2) return { score: 25, label: "Faible", color: "#F04B69" }
    if (score <= 4) return { score: 50, label: "Moyen", color: "#F0783C" }
    if (score <= 6) return { score: 75, label: "Fort", color: "#DCB40A" }
    return { score: 100, label: "Très fort", color: "#28B95F" }
  }

  const strength = getPasswordStrength(password)

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #5F00BA 0%, #7C3AED 100%)" }}
          >
            <Key className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
              Générateur de mots de passe
            </h1>
            <p style={{ color: "#666666" }}>
              Créez des mots de passe sécurisés et uniques
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Generator */}
        <div className="lg:col-span-2 space-y-6">
          {/* Password Display */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5" style={{ color: "#5F00BA" }} />
              <h2 className="font-semibold" style={{ color: "#111111" }}>
                Mot de passe généré
              </h2>
            </div>

            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                readOnly
                placeholder="Cliquez sur Générer"
                className="w-full px-4 py-4 pr-24 rounded-xl text-lg font-mono"
                style={{
                  ...inputStyle,
                  fontSize: "18px",
                  letterSpacing: "1px",
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                  title={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" style={{ color: "#666666" }} />
                  ) : (
                    <Eye className="w-5 h-5" style={{ color: "#666666" }} />
                  )}
                </button>
                <button
                  onClick={() => password && copyToClipboard(password)}
                  disabled={!password}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-50"
                  title="Copier"
                >
                  {copied ? (
                    <Check className="w-5 h-5" style={{ color: "#28B95F" }} />
                  ) : (
                    <Copy className="w-5 h-5" style={{ color: "#666666" }} />
                  )}
                </button>
              </div>
            </div>

            {/* Strength Indicator */}
            {password && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: "#666666" }}>
                    Force du mot de passe
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "#EEEEEE" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${strength.score}%`,
                      background: strength.color,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generatePassword}
              className="w-full py-3 px-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #5F00BA 0%, #7C3AED 100%)" }}
            >
              <RefreshCw className="w-5 h-5" />
              Générer un nouveau mot de passe
            </button>
          </div>

          {/* Options */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5" style={{ color: "#F0783C" }} />
              <h2 className="font-semibold" style={{ color: "#111111" }}>
                Options
              </h2>
            </div>

            {/* Length Slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "#111111" }}>
                  Longueur
                </label>
                <span
                  className="text-sm font-mono px-2 py-1 rounded"
                  style={{ background: "#F5F5F7", color: "#5F00BA" }}
                >
                  {length} caractères
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="64"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #5F00BA 0%, #5F00BA ${((length - 6) / 58) * 100}%, #EEEEEE ${((length - 6) / 58) * 100}%, #EEEEEE 100%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "#999999" }}>6</span>
                <span className="text-xs" style={{ color: "#999999" }}>64</span>
              </div>
            </div>

            {/* Character Options */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50" style={{ background: includeLowercase ? "#F0EBFA" : "#F5F5F7" }}>
                <input
                  type="checkbox"
                  checked={includeLowercase}
                  onChange={(e) => setIncludeLowercase(e.target.checked)}
                  className="w-5 h-5 rounded accent-purple-600"
                />
                <div>
                  <div className="font-medium text-sm" style={{ color: "#111111" }}>Minuscules</div>
                  <div className="text-xs" style={{ color: "#666666" }}>a-z</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50" style={{ background: includeUppercase ? "#F0EBFA" : "#F5F5F7" }}>
                <input
                  type="checkbox"
                  checked={includeUppercase}
                  onChange={(e) => setIncludeUppercase(e.target.checked)}
                  className="w-5 h-5 rounded accent-purple-600"
                />
                <div>
                  <div className="font-medium text-sm" style={{ color: "#111111" }}>Majuscules</div>
                  <div className="text-xs" style={{ color: "#666666" }}>A-Z</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50" style={{ background: includeNumbers ? "#F0EBFA" : "#F5F5F7" }}>
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="w-5 h-5 rounded accent-purple-600"
                />
                <div>
                  <div className="font-medium text-sm" style={{ color: "#111111" }}>Chiffres</div>
                  <div className="text-xs" style={{ color: "#666666" }}>0-9</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50" style={{ background: includeSymbols ? "#F0EBFA" : "#F5F5F7" }}>
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="w-5 h-5 rounded accent-purple-600"
                />
                <div>
                  <div className="font-medium text-sm" style={{ color: "#111111" }}>Symboles</div>
                  <div className="text-xs" style={{ color: "#666666" }}>!@#$%...</div>
                </div>
              </label>
            </div>

            {/* Exclude Ambiguous */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "#EEEEEE" }}>
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50" style={{ background: excludeAmbiguous ? "#FEF3C7" : "#F5F5F7" }}>
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  className="w-5 h-5 rounded accent-yellow-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm" style={{ color: "#111111" }}>
                    Exclure les caractères ambigus
                  </div>
                  <div className="text-xs" style={{ color: "#666666" }}>
                    0, O, 1, l, I (évite les confusions)
                  </div>
                </div>
                <AlertTriangle className="w-4 h-4" style={{ color: "#DCB40A" }} />
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" style={{ color: "#28B95F" }} />
              <h2 className="font-semibold" style={{ color: "#111111" }}>
                Conseils de sécurité
              </h2>
            </div>

            <ul className="space-y-3 text-sm" style={{ color: "#666666" }}>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#28B95F" }} />
                <span>Utilisez au moins 12 caractères</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#28B95F" }} />
                <span>Mélangez majuscules, minuscules, chiffres et symboles</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#28B95F" }} />
                <span>N'utilisez jamais le même mot de passe deux fois</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#28B95F" }} />
                <span>Stockez vos mots de passe dans un gestionnaire sécurisé</span>
              </li>
            </ul>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div
              className="rounded-2xl p-6"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" style={{ color: "#14B4E6" }} />
                  <h2 className="font-semibold" style={{ color: "#111111" }}>
                    Historique
                  </h2>
                </div>
                <button
                  onClick={() => setHistory([])}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: "#666666" }}
                >
                  Effacer
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((pwd, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg group hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className="flex-1 font-mono text-xs truncate"
                      style={{ color: "#666666" }}
                      title={pwd}
                    >
                      {pwd}
                    </span>
                    <button
                      onClick={() => copyToClipboard(pwd)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                      title="Copier"
                    >
                      <Copy className="w-4 h-4" style={{ color: "#666666" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Presets */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5" style={{ color: "#DCB40A" }} />
              <h2 className="font-semibold" style={{ color: "#111111" }}>
                Préréglages rapides
              </h2>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setLength(8)
                  setIncludeUppercase(true)
                  setIncludeLowercase(true)
                  setIncludeNumbers(true)
                  setIncludeSymbols(false)
                  setExcludeAmbiguous(false)
                }}
                className="w-full text-left p-3 rounded-xl transition-colors hover:bg-gray-50"
                style={{ background: "#F5F5F7" }}
              >
                <div className="font-medium text-sm" style={{ color: "#111111" }}>Simple</div>
                <div className="text-xs" style={{ color: "#666666" }}>8 caractères, sans symboles</div>
              </button>

              <button
                onClick={() => {
                  setLength(16)
                  setIncludeUppercase(true)
                  setIncludeLowercase(true)
                  setIncludeNumbers(true)
                  setIncludeSymbols(true)
                  setExcludeAmbiguous(false)
                }}
                className="w-full text-left p-3 rounded-xl transition-colors hover:bg-gray-50"
                style={{ background: "#F5F5F7" }}
              >
                <div className="font-medium text-sm" style={{ color: "#111111" }}>Standard</div>
                <div className="text-xs" style={{ color: "#666666" }}>16 caractères, tous types</div>
              </button>

              <button
                onClick={() => {
                  setLength(32)
                  setIncludeUppercase(true)
                  setIncludeLowercase(true)
                  setIncludeNumbers(true)
                  setIncludeSymbols(true)
                  setExcludeAmbiguous(true)
                }}
                className="w-full text-left p-3 rounded-xl transition-colors hover:bg-gray-50"
                style={{ background: "#F5F5F7" }}
              >
                <div className="font-medium text-sm" style={{ color: "#111111" }}>Fort</div>
                <div className="text-xs" style={{ color: "#666666" }}>32 caractères, sans ambigus</div>
              </button>

              <button
                onClick={() => {
                  setLength(64)
                  setIncludeUppercase(true)
                  setIncludeLowercase(true)
                  setIncludeNumbers(true)
                  setIncludeSymbols(true)
                  setExcludeAmbiguous(true)
                }}
                className="w-full text-left p-3 rounded-xl transition-colors hover:bg-gray-50"
                style={{ background: "#F5F5F7" }}
              >
                <div className="font-medium text-sm" style={{ color: "#111111" }}>Maximum</div>
                <div className="text-xs" style={{ color: "#666666" }}>64 caractères, ultra sécurisé</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
