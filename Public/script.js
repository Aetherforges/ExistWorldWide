let cart = []

function addToCart(name,price){
cart.push({name,price})
updateCart()
}

function updateCart(){

let cartItems=document.getElementById("cartItems")
cartItems.innerHTML=""
let total=0

cart.forEach((item,index)=>{

let div=document.createElement("div")
div.className="cart-item"
div.innerHTML=`
${item.name} - ₱${item.price}
<button onclick="removeItem(${index})">X</button>
`

cartItems.appendChild(div)
total+=item.price
})

document.getElementById("cartTotal").innerText="Total: ₱"+total
document.getElementById("cart-count").innerText=cart.length
}

function removeItem(index){
cart.splice(index,1)
updateCart()
}

function toggleCart(){
document.getElementById("cartPanel").classList.toggle("open")
}

function openCheckout(){
document.getElementById("checkout").style.display="flex"
generateOrder()
}

function closeCheckout(){
document.getElementById("checkout").style.display="none"
}

function generateOrder(){

let name=document.getElementById("name").value
let phone=document.getElementById("phone").value
let address=document.getElementById("address").value

let text=`Name: ${name}
Phone: ${phone}
Shipping Address: ${address}

----------------------------
ORDER SUMMARY
`

let total=0

cart.forEach(item=>{
text+=`${item.name} - ₱${item.price}\n`
total+=item.price
})

text+=`
----------------------------
Total - ₱${total}
`

document.getElementById("finalOrder").value=text
}

function copyOrder(){
generateOrder()
let text=document.getElementById("finalOrder")
text.select()
document.execCommand("copy")
alert("Order copied!")
}

/* CATEGORY FILTER */

function filterProducts(){

let selected=document.getElementById("categoryFilter").value
let products=document.querySelectorAll(".product")

products.forEach(product=>{

if(selected==="all" || product.dataset.category===selected){
product.style.display="block"
}else{
product.style.display="none"
}

})

}