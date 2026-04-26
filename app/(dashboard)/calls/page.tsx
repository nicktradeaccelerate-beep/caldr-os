'use client';

import { useState, useEffect, useCallback } from 'react';
import CallRecordingPlayer from '@/components/calls/CallRecordingPlayer';
import CallAnalytics from '@/components/calls/CallAnalytics';
import NumberSharing from '@/components/calls/NumberSharing';
import PreCallBrief from '@/components/calls/PreCallBrief';
import LiveCallPanel from '@/components/calls/LiveCallPanel';
import PostCallDebrief from '@/components/calls/PostCallDebrief';
import SupervisorModal from '@/components/calls/SupervisorModal';
import CallMap, { getAreaCoords } from '@/components/calls/CallMap';
import { getLocationFromNumber } from '@/lib/twilio/areacodes';
import type { IncomingCall, CompletedCall, ActiveCall } from '@/types';
import type { MapPin } from '@/components/calls/CallMap';

export const dynamic = 'force-dynamic';

const TABS = ['Live', 'Recordings', 'Analytics', 'Sharing'] as const;
type Tab = typeof TABS[number];

type CallState = 'idle' | 'incoming' | 'active' | 'debrief';

interface NearbyJobResponse {
  id: string;
  address: string;
  postcode: string;
  jobType: string;
  value: string | null;
  lat: number;
  lng: number;
}

// Demo data — replaced by real Twilio events in production
const DEMO_INCOMING: IncomingCall = {
  contactName: null,
  area: null,
  number: '+442079460123',
};

const DEMO_BUSINESS_ID = 'demo-business-id';

export default function CallsPage() {
  const [tab, setTab] = useState<Tab>('Live');
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(0);
  const [showSupervisor, setShowSupervisor] = useState(false);
  const [resolvedLeadId, setResolvedLeadId] = useState<string | null>(null);
  const [mapPins, setMapPins] = useState<MapPin[] | undefined>(undefined);
  const [crmLoading, setCrmLoading] = useState(false);

  // Derive area + fetch BFB jobs whenever an incoming call starts
  const loadMapData = useCallback(async (number: string) => {
    const coords = getLocationFromNumber(number) ?? getAreaCoords(number);
    if (!coords) return;

    setCrmLoading(true);
    try {
      const res = await fetch(
        `/api/bfb/nearby-jobs?lat=${coords.lat}&lng=${coords.lng}&businessId=${DEMO_BUSINESS_ID}`
      );
      const { jobs } = await res.json() as { jobs: NearbyJobResponse[] };

      const pins: MapPin[] = [
        // Prospect location pulse
        {
          id: 'prospect',
          label: coords.name,
          lat: coords.lat,
          lng: coords.lng,
          type: 'active',
          sentiment: undefined,
        },
        // BFB nearby jobs
        ...jobs.map(j => ({
          id: j.id,
          label: `${j.jobType} — ${j.postcode}`,
          lat: j.lat,
          lng: j.lng,
          type: 'job' as const,
          value: j.value ?? undefined,
        })),
      ];
      setMapPins(pins);
    } catch {
      // Map falls back to demo pins
    } finally {
      setCrmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (callState === 'incoming' && incomingCall) {
      loadMapData(incomingCall.number);
    }
    if (callState === 'idle') {
      setMapPins(undefined);
      setResolvedLeadId(null);
    }
  }, [callState, incomingCall, loadMapData]);

  function simulateIncoming() {
    setIncomingCall(DEMO_INCOMING);
    setCallState('incoming');
  }

  function handleAnswer() {
    setCallState('active');
  }

  function handleDecline() {
    setIncomingCall(null);
    setCallState('idle');
  }

  function handleHangUp(durationSeconds: number) {
    setActiveDurationSeconds(durationSeconds);
    setCallState('debrief');
  }

  function handleDebriefClose() {
    setCallState('idle');
    setIncomingCall(null);
  }

  const completedCall: CompletedCall | null = incomingCall
    ? {
        contactName: incomingCall.contactName,
        durationMins: activeDurationSeconds / 60,
        sentiment: 78,
        flags: [],
        leadId: resolvedLeadId,
      }
    : null;

  const activeCall: ActiveCall = {
    vaName: 'You',
    contactName: incomingCall?.contactName ?? null,
    area: incomingCall?.area ?? (incomingCall?.number ? (getLocationFromNumber(incomingCall.number)?.name ?? null) : null),
    durationMins: Math.floor(activeDurationSeconds / 60),
    sentiment: 78,
    intent: 'Interested in quote',
    callSid: 'demo-call-sid',
  };

  const callerArea = incomingCall?.area
    ?? (incomingCall?.number ? (getLocationFromNumber(incomingCall.number)?.name ?? null) : null);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Pre-call brief overlay */}
      {callState === 'incoming' && incomingCall && (
        <PreCallBrief
          call={{ ...incomingCall, area: callerArea }}
          businessId={DEMO_BUSINESS_ID}
          onAnswer={handleAnswer}
          onDecline={handleDecline}
          onLeadResolved={setResolvedLeadId}
        />
      )}

      {/* Supervisor modal */}
      {showSupervisor && (
        <SupervisorModal
          call={activeCall}
          supervisorNumber="+44 7700 900 000"
          businessId={DEMO_BUSINESS_ID}
          onClose={() => setShowSupervisor(false)}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Caldr Call</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>VoIP · Live coaching · BFB CRM · Recordings</div>
          </div>
          {callState === 'active' && (
            <button
              onClick={() => setShowSupervisor(true)}
              style={{
                padding: '7px 14px',
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-light)',
                borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Supervisor
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '9px 16px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              color: tab === t ? 'var(--accent)' : 'var(--ink-2)',
              fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Live tab */}
      {tab === 'Live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {callState === 'idle' && (
            <div style={{
              padding: 28, background: 'var(--white)', borderRadius: 16,
              border: '1px solid var(--border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No active call</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>
                Inbound calls will appear here automatically.<br/>
                Your Twilio number rings this panel.
              </div>
              <button
                onClick={simulateIncoming}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 12,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Simulate incoming call
              </button>
            </div>
          )}

          {callState === 'active' && incomingCall && (
            <LiveCallPanel
              contactName={incomingCall.contactName}
              contactNumber={incomingCall.number}
              area={callerArea}
              callSid="demo-call-sid"
              businessId={DEMO_BUSINESS_ID}
              onHangUp={handleHangUp}
            />
          )}

          {callState === 'debrief' && completedCall && (
            <PostCallDebrief
              call={completedCall}
              businessId={DEMO_BUSINESS_ID}
              onClose={handleDebriefClose}
              onNewCall={() => {
                setCallState('idle');
                setIncomingCall(null);
                setTimeout(simulateIncoming, 600);
              }}
            />
          )}

          {/* Map — always visible, BFB pins loaded on incoming call */}
          <CallMap
            activePins={mapPins}
            callerArea={callerArea}
            crmLoading={crmLoading}
          />
        </div>
      )}

      {/* Recordings tab */}
      {tab === 'Recordings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>David Chen · 6:34</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 12 }}>14 Apr · Central London · Sentiment 91%</div>
            <CallRecordingPlayer duration={394} />
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--accent-pale)', borderRadius: 12, border: '1px solid var(--accent-light)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>AI Transcript excerpt</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.8 }}>
                <span style={{ color: '#1E3A8A', fontWeight: 600 }}>VA:</span> &quot;We completed a very similar project on Elm Street last month — beautiful Victorian terrace…&quot;<br/>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Contact:</span> &quot;Oh really? That&apos;s just around the corner from us!&quot;<br/>
                <span style={{ color: '#1E3A8A', fontWeight: 600 }}>VA:</span> &quot;Yes — shall we arrange a quick site visit this week?&quot;
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Analytics' && (
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--border)' }}>
          <CallAnalytics />
        </div>
      )}

      {tab === 'Sharing' && <NumberSharing />}
    </div>
  );
}
