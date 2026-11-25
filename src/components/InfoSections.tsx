import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STEPS = [
  {
    number: '01.',
    title: 'Configura el grupo y las reglas',
    description:
      'Define un título opcional, el precio mínimo del regalo y la fecha del intercambio. Añade a cada participante junto con sus gustos e ideas y un mensaje personal.',
  },
  {
    number: '02.',
    title: 'Genera el sorteo y comparte un único enlace',
    description:
      'El sistema empareja al grupo sin autoasignaciones, sin repetidos y respetando tus exclusiones opcionales. Todos los datos quedan codificados dentro del propio enlace.',
  },
  {
    number: '03.',
    title: 'Cada persona consulta su tarjeta privada',
    description:
      'Al abrir el enlace, cada participante ingresa su nombre para descubrir únicamente a quién le toca regalar, la fecha, el presupuesto mínimo y las pistas de esa persona.',
  },
];

const FAQS = [
  {
    question: '¿Necesito crear una cuenta o guardar contraseñas?',
    answer:
      'No. La aplicación funciona directamente en el navegador sin registros ni servidores externos. Toda la información del intercambio viaja codificada en el enlace compartido.',
  },
  {
    question: '¿El organizador puede ver todas las parejas?',
    answer:
      'No se muestran listas de parejas en la pantalla de confirmación para evitar arruinar la sorpresa. Si también participas, solo abre el enlace compartido y escribe tu nombre.',
  },
  {
    question: '¿Qué pasa si dos personas usan el mismo teléfono o computadora?',
    answer:
      'Dentro de la tarjeta privada hay un botón para ocultar la asignación y cambiar de participante sin salir del sorteo ni perder los datos.',
  },
  {
    question: '¿Se guarda lo que estoy escribiendo si recargo la página?',
    answer:
      'Sí. Mientras preparas la lista de participantes, tu borrador se guarda automáticamente en tu navegador para que no pierdas el avance si recargas la pestaña.',
  },
];

export const InfoSections: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mt-16 pt-12 border-t border-[#E4DFD5] dark:border-[#2A2621] space-y-16">
      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24">
        <div className="max-w-2xl mb-8">
          <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332] dark:text-[#84D2AA] mb-2">
            Cómo funciona
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1A1816] dark:text-[#F3EFE7] [text-wrap:balance]">
            Tres pasos para organizar el intercambio sin complicaciones
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6 transition-colors duration-200"
            >
              <span className="font-mono text-xs font-medium text-[#1B4332] dark:text-[#84D2AA] tabular-nums">
                {step.number}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold text-[#1A1816] dark:text-[#F3EFE7] leading-snug">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-[#57524A] dark:text-[#B5ADA1] leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332] dark:text-[#84D2AA] mb-2">
              Preguntas frecuentes
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1A1816] dark:text-[#F3EFE7] [text-wrap:balance]">
              Dudas comunes sobre el sorteo
            </h2>
            <p className="mt-2.5 text-sm text-[#57524A] dark:text-[#B5ADA1] leading-relaxed">
              Todo ocurre en tu navegador con enlaces privados compartibles por WhatsApp, correo o chat.
            </p>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl divide-y divide-[#EFECE6] dark:divide-[#2A2621]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full min-h-[56px] px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F4]/70 dark:hover:bg-[#23201C]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B4332] dark:focus-visible:ring-[#74C69D]"
                  >
                    <span className="text-sm sm:text-base font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                      {item.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp
                        className="w-4 h-4 text-[#6E685F] dark:text-[#A39B8F] shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDown
                        className="w-4 h-4 text-[#6E685F] dark:text-[#A39B8F] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-[#57524A] dark:text-[#B5ADA1] leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
