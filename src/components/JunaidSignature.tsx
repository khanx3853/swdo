import React from 'react';
import { TransparentSignature } from './TransparentSignature';

interface JunaidSignatureProps {
  className?: string;
}

export const JunaidSignature: React.FC<JunaidSignatureProps> = ({ className }) => {
  return (
    <TransparentSignature
      src="/junaid_signature.jpg"
      alt="Junaid Khan Signature"
      className={className || "h-12 w-auto mx-auto -mb-6 relative z-10"}
    />
  );
};

