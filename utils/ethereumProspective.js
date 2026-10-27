export function prospectiveOutcome(record,bars,source,now=new Date()){
 if(record.outcome)return record.outcome;
 const issued=Date.parse(record.recordedAt),deadline=Date.parse(record.targetClosesAt);
 if(!Number.isFinite(issued)||!Number.isFinite(deadline)||issued>=deadline)throw new Error('Prediction was not frozen before its target closed.');
 if(source!==record.source||now.getTime()<deadline)return null;
 const origin=bars.find(b=>b.date===record.originDate),target=bars.find(b=>b.date===record.targetDate);
 if(!origin||!target)return null;
 if(!Number.isFinite(origin.close)||!Number.isFinite(target.close)||origin.close<=0||target.close<=0)throw new Error('Invalid outcome candle.');
 if(Math.abs(origin.close-record.originClose)>Math.max(1e-6,record.originClose*1e-8))throw new Error('The source revised the frozen origin close; review before scoring.');
 const change=target.close/record.originClose-1,trend=change>record.threshold?'alcista':change< -record.threshold?'bajista':'estable';
 return {evaluatedAt:now.toISOString(),source,targetClose:target.close,return:change,actualTrend:trend,correct:trend===record.trend,comparisonCorrect:record.comparison?trend===record.comparison.trend:null,hoursFromIssueToClose:(deadline-issued)/3600000};
}
