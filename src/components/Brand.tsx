export function Logo({size = 40, showText = true}: {size?: number; showText?: boolean}) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/brand/meheal-logo-brain.jpg"
        alt="MeHeal"
        width={size}
        height={size}
        style={{width: size, height: size, objectFit: 'contain', mixBlendMode: 'multiply'}}
      />
      {showText && (
        <div className="leading-tight">
          <div className="font-extrabold text-brand-600 text-xl tracking-tight">MeHeal</div>
          <div className="text-[10px] text-gray-400 -mt-0.5">Sức khỏe Tâm thần</div>
        </div>
      )}
    </div>
  );
}
