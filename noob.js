const person1={
    name:'abc',
    surname:'bcd',
    myname: function(hotel,room){return this.name+" "+this.surname+hotel+room}
}
const person2={
    name:'ins',
    surname:'vikrant'
}

console.log(person1.myname.call(person2,'roma cristo',80))

console.log(person1.myname.apply(person2,['hotel park',805]))

const result=person1.myname.bind(person2,'sitara',50)


person1.myname.call(person2);
person1.myname.apply(person2);
const returnObect=person1.myname.bind(person2);
console.log(returnObect());


const myPromise=new Promise((resolve,reject)=>{
    error=true;
    if(error)
    reject(error)
    
    setTimeout(() => {
        console.log("my name is mitesh")
        resolve()
    }, 1000);
})

myPromise.then(()=>{
    console.log("task is finished")
});

myPromise.catch((error)=>{
    console.log("error ocuured")
})
