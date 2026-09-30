# Plan without publication

Input: “Turn this agreed checkout spec into tickets; don't build yet.” The spec requires validation, payment handling and a rendered confirmation.

Expect: `hyper-plan` proposes complete demoable slices, with only genuine blockers, obtains breakdown agreement and writes one local file per ticket plus an index. It rejects cycles/missing edges. It does not make one ticket per horizontal layer, edit production code, publish issues, create branches or close the parent issue.
