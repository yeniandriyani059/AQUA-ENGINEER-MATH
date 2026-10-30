import React from 'react';
import { Modal } from '../common/UI';
import { MATERI, VideoMat, RingkasanMat, LKPDMat } from '../pages/Materi';

interface MatModalProps {
  k: 'video' | 'ringkasan' | 'lkpd';
  onClose: () => void;
}

export function MatModal({ k, onClose }: MatModalProps) {
  const m = MATERI.find((x) => x.k === k) || MATERI[0];

  return (
    <Modal title={m.t} onClose={onClose}>
      {k === 'video' ? (
        <VideoMat />
      ) : k === 'ringkasan' ? (
        <RingkasanMat />
      ) : (
        <LKPDMat />
      )}
    </Modal>
  );
}
